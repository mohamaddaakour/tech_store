package com.techstore;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

// UserDetailsServiceAutoConfiguration is a Spring Security auto-config that, when Spring Security
// is on the classpath and no custom UserDetailsService bean exists, auto-generates a default
// in-memory user — printing a random password to your console logs on startup, with username user.
// we are excluding it because we will have our own UserDetailsService
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)

// This tells Spring: "Scan the package tree for classes annotated @ConfigurationProperties, and register them as beans automatically."
@ConfigurationPropertiesScan
public class TechstoreApplication {
	public static void main(String[] args) {
		SpringApplication.run(TechstoreApplication.class, args);
	}
}