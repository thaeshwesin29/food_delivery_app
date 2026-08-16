import {
  Account,
  Avatars,
  Client,
  Databases,
  ID,
  Query,
  Storage,
} from "react-native-appwrite";

export const appwriteConfig = {
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
  platform: "com.jsm.foodordering",

  databaseId: "6a7e8e360010f8807f66",
  bucketId: "6a7ed2570036cfbe7510",

  userCollectionId: "user",
  categoriesCollectionId: "categories",
  menuCollectionId: "menu",
  customizationsCollectionId: "customizations",
  menuCustomizationsCollectionId: "menu_customizations",
};

export const client = new Client();

client
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId)
  .setPlatform(appwriteConfig.platform);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);

export const createUser = async ({
  email,
  password,
  name,
}: CreateUserParams) => {
  try {
    const newAccount = await account.create(
      ID.unique(),
      email,
      password,
      name
    );

    if (!newAccount) {
      throw new Error("Failed to create account");
    }

    await signIn({ email, password });

    const avatarUrl = avatars.getInitialsURL(name);

    return await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      {
        email,
        name,
        accountId: newAccount.$id,
        avatar: avatarUrl,
      }
    );
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : String(e));
  }
};

export const signIn = async ({
  email,
  password,
}: SignInParams) => {
  try {
    return await account.createEmailPasswordSession(
      email,
      password
    );
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : String(e));
  }
};

export const getCurrentUser = async () => {
  try {
    const currentAccount = await account.get();

    if (!currentAccount) {
      throw new Error("No authenticated account");
    }

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

    if (currentUser.documents.length === 0) {
      throw new Error("User document not found");
    }

    return currentUser.documents[0];
  } catch (e) {
    console.log(e);

    throw new Error(
      e instanceof Error ? e.message : String(e)
    );
  }
};

export const getMenu = async ({
  category,
  query,
  limit,
}: GetMenuParams) => {
  try {
    const queries: string[] = [];

    if (category) {
      queries.push(Query.equal("categories", category));
    }

    if (query) {
      queries.push(Query.search("name", query));
    }

    if (limit) {
      queries.push(Query.limit(limit));
    }

    const menus = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.menuCollectionId,
      queries
    );

    return menus.documents;
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : String(e));
  }
};

export const getCategories = async () => {
  try {
    const categories = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.categoriesCollectionId
    );

    return categories.documents;
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : String(e));
  }
};