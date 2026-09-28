package com.example.employee.library.mapper;

import com.example.employee.library.model.Employee;
import com.example.employee.library.model.EmployeeRequest;
import com.example.employee.library.model.EmployeeResponse;

public final class EmployeeMapper {
    private EmployeeMapper() {
    }

    public static Employee toEntity(EmployeeRequest request) {
        return new Employee(request.name(), request.email(), request.department());
    }

    public static void updateEntity(Employee employee, EmployeeRequest request) {
        employee.setName(request.name());
        employee.setEmail(request.email());
        employee.setDepartment(request.department());
    }

    public static EmployeeResponse toResponse(Employee employee) {
        return new EmployeeResponse(employee.getId(), employee.getName(), employee.getEmail(), employee.getDepartment());
    }
}