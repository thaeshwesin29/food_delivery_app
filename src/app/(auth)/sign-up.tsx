import { StyleSheet, Text, View, Button } from "react-native";
import React from "react";
import {router} from "expo-router"
const SignUp = () => {
  return (
    <View>
      <Text>sign-up</Text>
      <Button  title="Sign Up" onPress={() => router.push("/sign-in")}/>
    </View>
  );
};

export default SignUp;

const styles = StyleSheet.create({});