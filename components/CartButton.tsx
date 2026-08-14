import { View, Text, TouchableOpacity, Image } from "react-native";
import { images } from "@/constants";

const CartButton = () => {
  const totalItems = 10;

  return (
    <TouchableOpacity
      style={{
        position: "relative",
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#222222",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image
        source={images.bag}
        style={{
          width: 20,
          height: 20,
        }}
        resizeMode="contain"
      />

      {totalItems > 0 && (
        <View
          style={{
            position: "absolute",
            top: -5,
            right: -5,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: "#D33B0D",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 11,
              fontWeight: "700",
            }}
          >
            {totalItems}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default CartButton;