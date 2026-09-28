package com.example.employee.app.service;

import com.example.employee.app.repository.EmployeeRepository;
import com.example.employee.library.exception.EmployeeNotFoundException;
import com.example.employee.library.mapper.EmployeeMapper;
import com.example.employee.library.model.Employee;
import com.example.employee.library.model.EmployeeRequest;
import com.example.employee.library.model.EmployeeResponse;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class EmployeeServiceImpl implements EmployeeService {
    private static final String EMPLOYEE_CACHE = "employees";
    private static final String ALL_EMPLOYEES_KEY = "'all'";

    private final EmployeeRepository employeeRepository;

    public EmployeeServiceImpl(EmployeeRepository employeeRepository) {
        this.employeeRepository = employeeRepository;
    }

    @Override
    @Caching(
            put = @CachePut(cacheNames = EMPLOYEE_CACHE, key = "#result.id()"),
            evict = @CacheEvict(cacheNames = EMPLOYEE_CACHE, key = ALL_EMPLOYEES_KEY))
    public EmployeeResponse create(EmployeeRequest request) {
        Employee saved = employeeRepository.save(EmployeeMapper.toEntity(request));
        return EmployeeMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = EMPLOYEE_CACHE, key = ALL_EMPLOYEES_KEY)
    public List<EmployeeResponse> findAll() {
        return employeeRepository.findAll(Sort.by(Sort.Direction.ASC, "id")).stream()
                .map(EmployeeMapper::toResponse)
            .collect(Collectors.toCollection(ArrayList::new));
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = EMPLOYEE_CACHE, key = "#id")
    public EmployeeResponse findById(Long id) {
        return employeeRepository.findById(id)
                .map(EmployeeMapper::toResponse)
                .orElseThrow(() -> new EmployeeNotFoundException(id));
    }

    @Override
    @Caching(
            put = @CachePut(cacheNames = EMPLOYEE_CACHE, key = "#result.id()"),
            evict = @CacheEvict(cacheNames = EMPLOYEE_CACHE, key = ALL_EMPLOYEES_KEY))
    public EmployeeResponse update(Long id, EmployeeRequest request) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new EmployeeNotFoundException(id));
        EmployeeMapper.updateEntity(employee, request);
        return EmployeeMapper.toResponse(employeeRepository.save(employee));
    }

    @Override
    @Caching(evict = {
            @CacheEvict(cacheNames = EMPLOYEE_CACHE, key = "#id"),
            @CacheEvict(cacheNames = EMPLOYEE_CACHE, key = ALL_EMPLOYEES_KEY)
    })
    public void delete(Long id) {
        if (!employeeRepository.existsById(id)) {
            throw new EmployeeNotFoundException(id);
        }
        employeeRepository.deleteById(id);
    }
}