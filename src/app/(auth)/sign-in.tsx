import { StyleSheet, Text, View, Button } from "react-native";
import React from "react";
import {router}  from "expo-router"
const SignIn = () => {
  return (
    <View>
      <Text>sign-in</Text>
      <Button title="Sign In" onPress={()=> router.push("/sign-up")}/>
    </View>
  );
};

export default SignIn;

const styles = StyleSheet.create({});