package com.example.employee.library.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record EmployeeRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        @NotBlank String department) {
}