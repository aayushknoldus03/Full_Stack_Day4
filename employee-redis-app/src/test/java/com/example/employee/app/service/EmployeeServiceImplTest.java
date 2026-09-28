package com.example.employee.app.service;

import com.example.employee.app.repository.EmployeeRepository;
import com.example.employee.library.exception.EmployeeNotFoundException;
import com.example.employee.library.model.Employee;
import com.example.employee.library.model.EmployeeRequest;
import com.example.employee.library.model.EmployeeResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceImplTest {
    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private EmployeeServiceImpl employeeService;

    @Test
    void createPersistsAndReturnsEmployeeResponse() {
        EmployeeRequest request = new EmployeeRequest("Ada Lovelace", "ada@example.com", "Research");
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> {
            Employee employee = invocation.getArgument(0);
            employee.setId(7L);
            return employee;
        });

        EmployeeResponse response = employeeService.create(request);

        assertThat(response).isEqualTo(new EmployeeResponse(7L, "Ada Lovelace", "ada@example.com", "Research"));
        verify(employeeRepository).save(any(Employee.class));
    }

    @Test
    void findByIdThrowsWhenEmployeeDoesNotExist() {
        when(employeeRepository.findById(9L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> employeeService.findById(9L))
                .isInstanceOf(EmployeeNotFoundException.class)
                .hasMessage("Employee with id 9 was not found");
    }
}