import * as FileSystem from "expo-file-system";
import { ID, Permission, Role } from "react-native-appwrite";
import { appwriteConfig, databases, storage } from "./appwrite";
import dummyData from "./data";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    const isRateLimit =
      e?.code === 429 ||
      (typeof e?.message === "string" && e.message.includes("Rate limit"));

    if (isRateLimit && attempt < 8) {
      const wait = 1000 * Math.pow(2, attempt);
      console.log(`   ⏳ Rate limited, retrying after ${wait}ms...`);
      await sleep(wait);
      return retry(fn, attempt + 1);
    }

    throw e;
  }
}

interface Category {
  name: string;
  description: string;
}

interface Customization {
  name: string;
  price: number;
  type: "topping" | "side" | "size" | "crust" | string;
}

interface MenuItem {
  name: string;
  description: string;
  image_url: string;
  price: number;
  rating: number;
  calories: number;
  protein: number;
  category_name: string;
  customizations: string[];
}

interface DummyData {
  categories: Category[];
  customizations: Customization[];
  menu: MenuItem[];
}

const data = dummyData as DummyData;

/**
 * Delete ALL documents from a collection.
 *
 * We repeatedly request the first page and delete those documents.
 * This avoids leaving old documents behind.
 */
async function clearAll(collectionId: string): Promise<void> {
  console.log(`🧹 Clearing collection: ${collectionId}`);

  try {
    while (true) {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        collectionId,
        [],
      );

      if (response.documents.length === 0) {
        break;
      }

      for (const document of response.documents) {
        try {
          await retry(() =>
            databases.deleteDocument(
              appwriteConfig.databaseId,
              collectionId,
              document.$id,
            ),
          );

          console.log(`   🗑️ Deleted ${collectionId}: ${document.$id}`);

          await sleep(400);
        } catch (error) {
          console.error(
            `❌ Failed to delete ${collectionId}/${document.$id}`,
            error,
          );

          throw error;
        }
      }
    }

    console.log(`✅ Cleared collection: ${collectionId}`);
  } catch (error) {
    console.error(`❌ Failed to clear collection ${collectionId}:`, error);

    throw error;
  }
}

/**
 * Delete ALL files from Appwrite Storage bucket.
 */
async function clearStorage(): Promise<void> {
  console.log(`🧹 Clearing storage bucket: ${appwriteConfig.bucketId}`);

  try {
    while (true) {
      const response = await storage.listFiles(appwriteConfig.bucketId);

      if (response.files.length === 0) {
        break;
      }

      for (const file of response.files) {
        try {
          await retry(() =>
            storage.deleteFile(appwriteConfig.bucketId, file.$id),
          );

          console.log(`   🗑️ Deleted file: ${file.$id}`);

          await sleep(400);
        } catch (error) {
          console.error(`❌ Failed to delete file ${file.$id}:`, error);

          throw error;
        }
      }
    }

    console.log(`✅ Storage cleared`);
  } catch (error) {
    console.error(`❌ Failed to clear storage:`, error);

    throw error;
  }
}

/**
 * Upload an image URL to Appwrite Storage.
 */
async function uploadImageToStorage(imageUrl: string): Promise<string> {
  try {
    console.log(`⬆️ Uploading image: ${imageUrl}`);

    const fileName =
      imageUrl.split("/").pop()?.split("?")[0] || `file-${Date.now()}.jpg`;

    const localUri = `${FileSystem.cacheDirectory}${fileName}`;

    const download = await FileSystem.downloadAsync(imageUrl, localUri);

    if (download.status !== 200) {
      throw new Error(`Failed to download image: ${download.status}`);
    }

    const fileInfo = await FileSystem.getInfoAsync(download.uri);

    const fileObj = {
      name: fileName,
      type: "image/jpeg",
      size: fileInfo.exists ? fileInfo.size : 0,
      uri: download.uri,
    };

    const file = await retry(() =>
      storage.createFile(
        appwriteConfig.bucketId,
        ID.unique(),
        fileObj,
        [Permission.read(Role.any())],
      ),
    );

    console.log(`✅ Uploaded image: ${file.$id}`);

    return storage.getFileViewURL(appwriteConfig.bucketId, file.$id).toString();
  } catch (error) {
    console.error(`❌ Failed to upload image: ${imageUrl}`, error);

    throw error;
  }
}

/**
 * Validate that all category/customization references
 * from data.ts actually exist.
 */
function validateDummyData(): void {
  const categoryNames = new Set(
    data.categories.map((category) => category.name),
  );

  const customizationNames = new Set(
    data.customizations.map((customization) => customization.name),
  );

  for (const item of data.menu) {
    if (!categoryNames.has(item.category_name)) {
      throw new Error(
        `Menu "${item.name}" references category "${item.category_name}", but that category does not exist in data.ts`,
      );
    }

    for (const customization of item.customizations) {
      if (!customizationNames.has(customization)) {
        throw new Error(
          `Menu "${item.name}" references customization "${customization}", but that customization does not exist in data.ts`,
        );
      }
    }
  }

  console.log("✅ Dummy data validation passed");
}

/**
 * Seed Appwrite database.
 */
async function seed(): Promise<void> {
  console.log("========================================");
  console.log("🌱 STARTING APPWRITE DATABASE SEED");
  console.log("========================================");

  try {
    // --------------------------------------------------
    // 0. Validate local dummy data
    // --------------------------------------------------

    validateDummyData();

    // --------------------------------------------------
    // 1. Clear existing data
    // --------------------------------------------------
    //
    // IMPORTANT:
    // Delete dependent collections first because
    // menu_customizations depends on menu/customizations.
    //
    // Do NOT delete the user collection.
    // --------------------------------------------------

    await clearAll(appwriteConfig.menuCustomizationsCollectionId);

    await clearAll(appwriteConfig.menuCollectionId);

    await clearAll(appwriteConfig.customizationsCollectionId);

    await clearAll(appwriteConfig.categoriesCollectionId);

    // --------------------------------------------------
    // 2. Clear images
    // --------------------------------------------------

    await clearStorage();

    // --------------------------------------------------
    // 3. Create Categories
    // --------------------------------------------------

    console.log("========================================");
    console.log("📁 Creating categories");
    console.log("========================================");

    const categoryMap: Record<string, string> = {};

    for (const category of data.categories) {
      console.log(`Creating category: ${category.name}`);

      const document = await retry(() =>
        databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.categoriesCollectionId,
          ID.unique(),
          {
            name: category.name,
            description: category.description,
          },
        ),
      );

      categoryMap[category.name] = document.$id;

      console.log(`✅ Category created: ${category.name} → ${document.$id}`);

      await sleep(400);
    }

    // --------------------------------------------------
    // 4. Create Customizations
    // --------------------------------------------------

    console.log("========================================");
    console.log("🧂 Creating customizations");
    console.log("========================================");

    const customizationMap: Record<string, string> = {};

    for (const customization of data.customizations) {
      console.log(`Creating customization: ${customization.name}`);

      const document = await retry(() =>
        databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.customizationsCollectionId,
          ID.unique(),
          {
            name: customization.name,
            price: customization.price,
            type: customization.type,
          },
        ),
      );

      customizationMap[customization.name] = document.$id;

      console.log(
        `✅ Customization created: ${customization.name} → ${document.$id}`,
      );

      await sleep(400);
    }

    // --------------------------------------------------
    // 5. Create Menu Items
    // --------------------------------------------------

    console.log("========================================");
    console.log("🍔 Creating menu items");
    console.log("========================================");

    for (const item of data.menu) {
      console.log(`Creating menu item: ${item.name}`);

      // ----------------------------------------------
      // Find category document ID
      // ----------------------------------------------

      const categoryId = categoryMap[item.category_name];

      if (!categoryId) {
        throw new Error(
          `Category "${item.category_name}" was not found for menu item "${item.name}"`,
        );
      }

      // ----------------------------------------------
      // Use the original image URL directly (avoids Appwrite
      // storage auth requirement for public image rendering)
      // ----------------------------------------------

      const uploadedImage = item.image_url;

      // ----------------------------------------------
      // Create menu document
      // ----------------------------------------------

      const menuDocument = await retry(() =>
        databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.menuCollectionId,
          ID.unique(),
          {
            name: item.name,
            description: item.description,
            image_url: uploadedImage,
            price: item.price,
            rating: item.rating,
            calories: item.calories,
            protein: item.protein,

            // Appwrite relationship:
            categories: categoryId,
          },
        ),
      );

      console.log(`✅ Menu created: ${item.name} → ${menuDocument.$id}`);

      await sleep(400);

      // ----------------------------------------------
      // Create menu_customizations
      // ----------------------------------------------

      for (const customizationName of item.customizations) {
        const customizationId = customizationMap[customizationName];

        if (!customizationId) {
          throw new Error(
            `Customization "${customizationName}" was not found for menu item "${item.name}"`,
          );
        }

        const relationDocument = await retry(() =>
          databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.menuCustomizationsCollectionId,
            ID.unique(),
            {
              menu: menuDocument.$id,
              customizations: customizationId,
            },
          ),
        );

        console.log(
          `   ✅ Relationship created: ${item.name} → ${customizationName} → ${relationDocument.$id}`,
        );

        await sleep(400);
      }
    }

    // --------------------------------------------------
    // Finished
    // --------------------------------------------------

    console.log("========================================");
    console.log("🎉 SEEDING COMPLETE");
    console.log("========================================");
  } catch (error) {
    console.error("========================================");
    console.error("❌ SEEDING FAILED");
    console.error("========================================");
    console.error(error);

    throw error;
  }
}

export default seed;
