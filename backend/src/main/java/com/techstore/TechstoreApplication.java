package com.techstore;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

/**
 * Application entry point.
 *
 * <p>{@code @SpringBootApplication} switches on component scanning for everything under
 * {@code com.techstore}, so every {@code @RestController}, {@code @Service} and
 * {@code @Configuration} in the packages below is found automatically.
 *
 * <p>{@code @ConfigurationPropertiesScan} does the same for {@code @ConfigurationProperties}
 * classes, which are NOT picked up by ordinary component scanning. Without it,
 * {@code JwtProperties} and {@code CorsProperties} would never be registered as beans.
 */
@SpringBootApplication(
		/*
		 * By default Spring Security invents a single in-memory user called "user" with a random
		 * password, and prints that password to the console on every boot. That default exists for
		 * apps using form login or HTTP Basic; we authenticate purely from JWTs, so it is dead
		 * weight -- and a random credential appearing in the startup log is the kind of thing that
		 * gets copied into a bug report. Excluding it removes the warning and the phantom account.
		 */
		exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
public class TechstoreApplication {

	public static void main(String[] args) {
		SpringApplication.run(TechstoreApplication.class, args);
	}
}
