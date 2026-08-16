import {View, Text, TouchableOpacity, Image, StyleSheet} from 'react-native'
import {images} from "@/constants";
import {useCartStore} from "@/store/cart.store";
import {router} from "expo-router";

const CartButton = () => {
    const { getTotalItems } = useCartStore();
    const totalItems = getTotalItems();

    return (
        <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/cart')}
            activeOpacity={0.85}
        >
            <Image
                source={images.bag}
                style={styles.icon}
                resizeMode="contain"
                tintColor="#ffffff"
            />

            {totalItems > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{totalItems}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        position: 'relative',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FE8C00',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FE8C00',
        shadowOpacity: 0.4,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
        elevation: 6,
    },
    icon: {
        width: 22,
        height: 22,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#F14141',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
        borderWidth: 1.5,
        borderColor: '#ffffff',
    },
    badgeText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '700',
    },
});

export default CartButton;
