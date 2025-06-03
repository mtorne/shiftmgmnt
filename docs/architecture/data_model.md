# Employee Shift Management System - Data Model

## Overview

This document details the data model for the Employee Shift Management System. The data model is designed to support all functional requirements while ensuring data integrity, efficient querying, and compliance with legal regulations for employee scheduling. The model captures the complex relationships between employees, positions, shifts, and scheduling constraints.

## Entity Relationship Diagram

The data model consists of several interconnected entities that together form the foundation of the shift management system. The primary entities and their relationships are described in detail below.

## Core Entities

### User

The User entity represents system users who can access the application with different permission levels.

**Attributes:**
- `id`: UUID (Primary Key)
- `username`: String (Unique)
- `email`: String (Unique)
- `password_hash`: String
- `first_name`: String
- `last_name`: String
- `role`: Enum ('admin', 'scheduler', 'employee')
- `is_active`: Boolean
- `last_login`: DateTime
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships:**
- One-to-One relationship with Employee (for users with employee role)

### Employee

The Employee entity contains detailed information about each staff member, including their work hour allocations and preferences.

**Attributes:**
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to User, nullable)
- `employee_code`: String (Unique)
- `first_name`: String
- `last_name`: String
- `email`: String
- `phone`: String
- `date_of_birth`: Date
- `hire_date`: Date
- `termination_date`: Date (nullable)
- `yearly_hour_quota`: Integer (default: 1,760)
- `used_hours`: Integer (default: 0)
- `remaining_hours`: Integer (calculated)
- `is_active`: Boolean
- `notes`: Text
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships:**
- One-to-One relationship with User (optional)
- Many-to-Many relationship with Position through EmployeePosition
- One-to-Many relationship with Shift
- One-to-Many relationship with EmployeeAvailability
- One-to-Many relationship with EmployeeViolation

### Position

The Position entity defines job roles within the organization, including coverage requirements and staffing needs.

**Attributes:**
- `id`: UUID (Primary Key)
- `name`: String
- `description`: Text
- `department`: String
- `is_24x7`: Boolean
- `weekly_pattern`: JSON (defines days of week with coverage)
- `daily_hours`: Integer (e.g., 24 for 24-hour coverage, 16 for 16-hour coverage)
- `min_staff_per_shift`: Integer
- `required_skills`: JSON (array of required skills)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships:**
- Many-to-Many relationship with Employee through EmployeePosition
- One-to-Many relationship with Shift
- One-to-Many relationship with ShiftTemplate

### EmployeePosition

This junction entity maps employees to positions they can work in, potentially with position-specific attributes.

**Attributes:**
- `id`: UUID (Primary Key)
- `employee_id`: UUID (Foreign Key to Employee)
- `position_id`: UUID (Foreign Key to Position)
- `is_primary`: Boolean
- `proficiency_level`: Enum ('beginner', 'intermediate', 'advanced', 'expert')
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships:**
- Many-to-One relationship with Employee
- Many-to-One relationship with Position

### Shift

The Shift entity represents a specific work period assigned to an employee.

**Attributes:**
- `id`: UUID (Primary Key)
- `position_id`: UUID (Foreign Key to Position)
- `employee_id`: UUID (Foreign Key to Employee, nullable for unassigned shifts)
- `shift_date`: Date
- `start_time`: DateTime
- `end_time`: DateTime
- `duration_hours`: Decimal (calculated)
- `is_night_shift`: Boolean (calculated)
- `is_weekend`: Boolean (calculated)
- `status`: Enum ('scheduled', 'completed', 'absent', 'modified')
- `actual_start_time`: DateTime (nullable)
- `actual_end_time`: DateTime (nullable)
- `actual_duration_hours`: Decimal (nullable, calculated)
- `notes`: Text
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships:**
- Many-to-One relationship with Position
- Many-to-One relationship with Employee
- Many-to-One relationship with Schedule

### Schedule

The Schedule entity represents a collection of shifts for a specific time period.

**Attributes:**
- `id`: UUID (Primary Key)
- `name`: String
- `start_date`: Date
- `end_date`: Date
- `status`: Enum ('draft', 'published', 'archived')
- `generation_method`: Enum ('automatic', 'manual', 'mixed')
- `created_by`: UUID (Foreign Key to User)
- `published_at`: DateTime (nullable)
- `published_by`: UUID (Foreign Key to User, nullable)
- `notes`: Text
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships:**
- Many-to-One relationship with User (created_by)
- Many-to-One relationship with User (published_by)
- One-to-Many relationship with Shift

### ShiftTemplate

The ShiftTemplate entity defines recurring shift patterns for positions.

**Attributes:**
- `id`: UUID (Primary Key)
- `position_id`: UUID (Foreign Key to Position)
- `name`: String
- `day_of_week`: Integer (0-6, where 0 is Sunday)
- `start_time`: Time
- `end_time`: Time
- `duration_hours`: Decimal (calculated)
- `min_staff`: Integer
- `is_active`: Boolean
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships:**
- Many-to-One relationship with Position

### EmployeeAvailability

The EmployeeAvailability entity tracks when employees are available or unavailable for scheduling.

**Attributes:**
- `id`: UUID (Primary Key)
- `employee_id`: UUID (Foreign Key to Employee)
- `start_datetime`: DateTime
- `end_datetime`: DateTime
- `availability_type`: Enum ('available', 'preferred', 'unavailable')
- `recurrence_pattern`: JSON (nullable, for recurring availability)
- `reason`: String
- `is_approved`: Boolean
- `approved_by`: UUID (Foreign Key to User, nullable)
- `approved_at`: DateTime (nullable)
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships:**
- Many-to-One relationship with Employee
- Many-to-One relationship with User (approved_by)

### EmployeeViolation

The EmployeeViolation entity records instances where scheduling constraints or legal requirements are violated.

**Attributes:**
- `id`: UUID (Primary Key)
- `employee_id`: UUID (Foreign Key to Employee)
- `shift_id`: UUID (Foreign Key to Shift, nullable)
- `violation_type`: Enum ('daily_hours_exceeded', 'insufficient_rest', 'consecutive_days', 'yearly_quota_exceeded')
- `violation_date`: Date
- `severity`: Enum ('warning', 'minor', 'major', 'critical')
- `description`: Text
- `resolution_status`: Enum ('open', 'acknowledged', 'resolved', 'waived')
- `resolved_by`: UUID (Foreign Key to User, nullable)
- `resolved_at`: DateTime (nullable)
- `resolution_notes`: Text
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships:**
- Many-to-One relationship with Employee
- Many-to-One relationship with Shift (optional)
- Many-to-One relationship with User (resolved_by)

### SchedulingConstraint

The SchedulingConstraint entity defines rules that the scheduling engine must follow.

**Attributes:**
- `id`: UUID (Primary Key)
- `name`: String
- `description`: Text
- `constraint_type`: Enum ('legal', 'organizational', 'preference')
- `priority`: Integer (higher number means higher priority)
- `rule_definition`: JSON (contains the specific rule parameters)
- `is_active`: Boolean
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships:**
- No direct relationships, but used by the scheduling engine

### ScheduleChangeRequest

The ScheduleChangeRequest entity tracks requests for schedule modifications.

**Attributes:**
- `id`: UUID (Primary Key)
- `employee_id`: UUID (Foreign Key to Employee)
- `shift_id`: UUID (Foreign Key to Shift, nullable)
- `requested_date`: Date (nullable)
- `requested_start_time`: Time (nullable)
- `requested_end_time`: Time (nullable)
- `request_type`: Enum ('time_off', 'shift_swap', 'schedule_change')
- `reason`: Text
- `status`: Enum ('pending', 'approved', 'denied', 'cancelled')
- `reviewed_by`: UUID (Foreign Key to User, nullable)
- `reviewed_at`: DateTime (nullable)
- `review_notes`: Text
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships:**
- Many-to-One relationship with Employee
- Many-to-One relationship with Shift (optional)
- Many-to-One relationship with User (reviewed_by)

### Report

The Report entity stores generated reports for future reference.

**Attributes:**
- `id`: UUID (Primary Key)
- `name`: String
- `report_type`: Enum ('hours_worked', 'violations', 'coverage', 'employee_schedule')
- `parameters`: JSON (contains the report parameters)
- `result_data`: JSON (contains the report data)
- `format`: Enum ('json', 'pdf', 'excel')
- `file_path`: String (nullable, for stored report files)
- `generated_by`: UUID (Foreign Key to User)
- `generated_at`: DateTime
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships:**
- Many-to-One relationship with User (generated_by)

## Supporting Entities

### AuditLog

The AuditLog entity tracks significant system actions for accountability and troubleshooting.

**Attributes:**
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to User, nullable)
- `action`: String
- `entity_type`: String
- `entity_id`: UUID (nullable)
- `old_values`: JSON (nullable)
- `new_values`: JSON (nullable)
- `ip_address`: String
- `user_agent`: String
- `created_at`: DateTime

**Relationships:**
- Many-to-One relationship with User (optional)

### Notification

The Notification entity manages system notifications to users.

**Attributes:**
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key to User)
- `title`: String
- `message`: Text
- `notification_type`: Enum ('info', 'warning', 'alert', 'schedule_change')
- `related_entity_type`: String (nullable)
- `related_entity_id`: UUID (nullable)
- `is_read`: Boolean
- `read_at`: DateTime (nullable)
- `created_at`: DateTime

**Relationships:**
- Many-to-One relationship with User

### SystemSetting

The SystemSetting entity stores configuration parameters for the application.

**Attributes:**
- `id`: UUID (Primary Key)
- `key`: String (Unique)
- `value`: Text
- `data_type`: Enum ('string', 'integer', 'float', 'boolean', 'json')
- `description`: Text
- `is_editable`: Boolean
- `created_at`: DateTime
- `updated_at`: DateTime

**Relationships:**
- No relationships

## Database Indexes

To ensure optimal performance, the following indexes will be created:

1. Employee indexes:
   - Index on `employee_code` for quick lookups
   - Index on `is_active` to filter active employees
   - Composite index on `first_name` and `last_name` for name searches

2. Shift indexes:
   - Index on `shift_date` for date-based queries
   - Composite index on `employee_id` and `shift_date` for employee schedule lookups
   - Composite index on `position_id` and `shift_date` for position schedule lookups
   - Index on `status` for filtering by shift status

3. Schedule indexes:
   - Index on `status` for filtering by schedule status
   - Composite index on `start_date` and `end_date` for date range queries

4. EmployeeAvailability indexes:
   - Composite index on `employee_id` and `start_datetime` for availability lookups
   - Index on `availability_type` for filtering by type

5. EmployeeViolation indexes:
   - Index on `violation_date` for date-based queries
   - Composite index on `employee_id` and `violation_date` for employee violation lookups
   - Index on `resolution_status` for filtering by status

## Data Integrity Constraints

The following constraints will be enforced to maintain data integrity:

1. **Foreign Key Constraints**: All relationships between entities will be enforced through foreign key constraints with appropriate cascade actions.

2. **Check Constraints**:
   - Ensure `start_time` is before `end_time` for shifts and availability periods
   - Ensure `yearly_hour_quota` is positive
   - Ensure `min_staff_per_shift` is positive

3. **Unique Constraints**:
   - Unique employee codes
   - Unique usernames and emails
   - Unique system setting keys

4. **Not Null Constraints**:
   - Critical fields like employee names, shift dates, and position names cannot be null

## Data Migration and Seeding

Initial data migration will include:

1. **System Settings**: Default configuration parameters
2. **Scheduling Constraints**: Common legal and organizational constraints
3. **Admin User**: Default administrator account
4. **Sample Data**: Optional sample data for testing and demonstration

## Database Views

To simplify common queries, the following database views will be created:

1. **EmployeeScheduleView**: Combines employee and shift data for easy schedule access
2. **PositionCoverageView**: Shows staffing levels by position, date, and time
3. **ViolationSummaryView**: Summarizes violations by type, employee, and time period
4. **HoursWorkedView**: Calculates hours worked by employee, position, and time period

## Conclusion

The data model described in this document provides a comprehensive foundation for the Employee Shift Management System. It captures all required entities and relationships while ensuring data integrity, efficient querying, and support for the complex business rules involved in employee scheduling. The model is designed to be flexible enough to accommodate future enhancements while maintaining a clear structure that reflects the domain concepts.

The use of UUIDs as primary keys enhances security and facilitates potential future distribution of data across multiple databases if needed for scaling. The comprehensive tracking of creation and modification timestamps supports auditing and historical analysis. The separation of templates from actual schedules allows for efficient generation of recurring schedules while maintaining flexibility for adjustments.

This data model will be implemented in PostgreSQL, leveraging its robust support for complex data types, constraints, and indexing to ensure optimal performance and data integrity.
