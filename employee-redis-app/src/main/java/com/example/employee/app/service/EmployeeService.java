package com.example.employee.app.service;

import com.example.employee.library.model.EmployeeRequest;
import com.example.employee.library.model.EmployeeResponse;

import java.util.List;

public interface EmployeeService {
    EmployeeResponse create(EmployeeRequest request);

    List<EmployeeResponse> findAll();

    EmployeeResponse findById(Long id);

    EmployeeResponse update(Long id, EmployeeRequest request);

    void delete(Long id);
}