package com.example;
import com.android.billingclient.api.*;
import java.lang.reflect.Method;
public class Test {
    public static void main(String[] args) {
        for (Method m : ProductDetails.class.getDeclaredMethods()) {
            System.out.println(m.getName());
        }
    }
}
