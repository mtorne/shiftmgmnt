# Employee Shift Management System - User Guide

## Introduction

Welcome to the Employee Shift Management System! This comprehensive application is designed to automatically calculate and assign shifts based on predefined constraints and legal regulations. The system manages employees, positions, and shift schedules with a strong focus on compliance and optimization.

This guide will help you understand how to use the system effectively and take advantage of all its features.

## Getting Started

### System Requirements

The Employee Shift Management System is a containerized application that can be deployed on any cloud VM with:
- Docker Engine (version 20.10+)
- Docker Compose (version 2.0+)
- At least 2 CPU cores
- Minimum 4GB RAM
- At least 20GB storage

### Accessing the System

After deployment, you can access the system through your web browser:
- Main Application: http://your-server-ip
- API Endpoints: http://your-server-ip:3000/api
- pgAdmin (if enabled): http://your-server-ip:5050

### Initial Login

Use the default admin credentials to log in for the first time:
- Username: admin
- Password: admin123

**Important**: Change the default admin password immediately after the first login.

## User Roles

The system supports three user roles with different permissions:

### Administrator
- Full access to all system features
- User management
- System configuration
- Report generation and export
- Violation resolution

### Scheduler
- Schedule generation and modification
- Employee assignment
- Coverage monitoring
- Schedule publication

### Employee
- View personal schedule
- Request time off or changes
- View work hours and quota

## Core Features

### Employee Management

The Employee Management module allows you to manage all employee information and track work hours.

#### Adding a New Employee
1. Navigate to the Employees section
2. Click the "Add Employee" button
3. Fill in all required fields:
   - Employee Code (unique identifier)
   - First Name
   - Last Name
   - Email
   - Hire Date
4. Optional fields:
   - Phone
   - Date of Birth
   - Yearly Hour Quota (defaults to 1,760)
   - Notes
5. Click "Save" to create the employee

#### Editing an Employee
1. Navigate to the Employees section
2. Find the employee in the list
3. Click the Edit icon
4. Update the necessary information
5. Click "Save" to apply changes

#### Deactivating an Employee
1. Navigate to the Employees section
2. Find the employee in the list
3. Click the Edit icon
4. Uncheck the "Active" checkbox
5. Click "Save" to apply changes

### Position Management

The Position Management module allows you to define job roles and their coverage requirements.

#### Adding a New Position
1. Navigate to the Positions section
2. Click the "Add Position" button
3. Fill in all required fields:
   - Position Name
   - Weekly Pattern (days requiring coverage)
   - Daily Hours
   - Minimum Staff Per Shift
4. Optional fields:
   - Description
   - Department
   - 24/7 Coverage toggle
   - Required Skills
5. Click "Save" to create the position

#### Editing a Position
1. Navigate to the Positions section
2. Find the position in the list
3. Click the Edit icon
4. Update the necessary information
5. Click "Save" to apply changes

### Shift Calendar

The Shift Calendar provides a visual representation of all scheduled shifts.

#### Viewing the Calendar
1. Navigate to the Shift Calendar section
2. Select the desired view:
   - By Position
   - By Employee
3. Choose the date range
4. Use the Month/Week/Day buttons to change the calendar view

#### Generating a Schedule
1. Navigate to the Shift Calendar section
2. Click the "Generate Schedule" button
3. Select the start and end dates for the schedule
4. Click "Generate" to create the schedule

#### Modifying Shifts
1. Navigate to the Shift Calendar section
2. Click on a shift in the calendar
3. In the shift details popup, you can:
   - Change the assigned employee
   - Modify shift times
   - Add notes
4. Click "Save" to apply changes

### Reports & Analytics

The Reports & Analytics module provides insights into scheduling, compliance, and staffing.

#### Generating Reports
1. Navigate to the Reports section
2. Select the report type:
   - Hours Worked
   - Violations & Alerts
   - Coverage Analysis
3. Choose the date range and filtering options
4. Click "Refresh Report" to generate the report

#### Exporting Reports
1. Navigate to the Reports section
2. Generate the desired report
3. Click the "Export" button
4. Select the export format (PDF or Excel)
5. The report will be downloaded to your computer

### Violations & Alerts

The system automatically detects and reports violations of scheduling constraints.

#### Viewing Violations
1. Navigate to the Reports section
2. Select the "Violations & Alerts" tab
3. Review the list of violations

#### Resolving Violations
1. Navigate to the Reports section
2. Select the "Violations & Alerts" tab
3. Find the violation in the list
4. Click the "Resolve" button
5. Select the resolution status and add notes
6. Click "Save" to resolve the violation

## Legal Compliance

The system enforces several legal constraints to ensure compliance:

1. **Maximum Daily Hours**: No employee works more than 8 hours per day
2. **Minimum Rest Period**: Employees get at least 11 hours rest between shifts
3. **Consecutive Days Off**: Employees get at least 2 consecutive free days per week
4. **Yearly Hour Quota**: Total yearly hours are not exceeded

The system automatically detects and reports violations of these constraints.

## Best Practices

### Schedule Generation
- Generate schedules at least 2 weeks in advance
- Review and resolve any violations before publishing
- Consider employee preferences when making manual adjustments

### Employee Management
- Keep employee information up to date
- Regularly review yearly hour quotas and usage
- Document any special skills or qualifications

### Position Management
- Define clear coverage requirements for each position
- Ensure minimum staffing levels are realistic
- Update position requirements as organizational needs change

## Troubleshooting

### Common Issues

#### Login Problems
- Verify your username and password
- Check if your account is active
- Contact an administrator if you cannot access the system

#### Schedule Generation Errors
- Ensure there are enough active employees for all positions
- Check for conflicting constraints
- Review employee availability

#### Report Generation Issues
- Verify the selected date range has data
- Check if all required filters are set
- Try refreshing the page and generating the report again

### Getting Help

If you encounter any issues not covered in this guide, please contact your system administrator or refer to the technical documentation.

## Conclusion

The Employee Shift Management System is designed to streamline your scheduling process while ensuring compliance with legal regulations. By following this guide, you can effectively manage your workforce scheduling and optimize resource allocation.

For technical details about deployment, configuration, and customization, please refer to the Deployment Guide and Technical Documentation.
