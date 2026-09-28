package com.example.employee.library.model;

import java.io.Serializable;

public record EmployeeResponse(Long id, String name, String email, String department) implements Serializable {
}