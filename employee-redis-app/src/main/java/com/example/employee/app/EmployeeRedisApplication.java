package com.example.employee.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.boot.autoconfigure.domain.EntityScan;

@SpringBootApplication
@EnableCaching
@EntityScan("com.example.employee.library.model")
public class EmployeeRedisApplication {
    public static void main(String[] args) {
        SpringApplication.run(EmployeeRedisApplication.class, args);
    }
}