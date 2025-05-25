# SalePoint Solution - AWS Web Application

## Project Overview
SalePoint is a comprehensive cloud-based web application designed to centralize sales data from multiple departments (warehouse, marketing, sales) into a single, unified platform. The SalePoint Solution helps sales staff access real-time product information and promotions, reducing errors and improving sales efficiency across the organization.

## Architecture
The system uses the following AWS services:
- **API Gateway**: Entry point for all client requests
- **Lambda Functions**: Serverless compute for business logic
- **Amazon Cognito**: User authentication and authorization
- **Amazon RDS (MySQL)**: Structured data storage
- **Amazon DynamoDB**: NoSQL data for fast access
- **Amazon S3**: Static file hosting and document storage
- **Amazon CloudWatch**: Monitoring and logging
- **VPC**: Network isolation and security

## Use Cases
1. Sales staff answering product comparison questions
2. Real-time stock availability checks
3. Management dashboard for team progress tracking
4. Quick access to product documentation

## Deployment Instructions
1. Deploy CloudFormation template
2. Configure Cognito User Pool
3. Deploy Lambda functions
4. Upload frontend to S3
5. Configure API Gateway

## Local Development Setup
1. Install AWS CLI and configure credentials
2. Install Node.js 18
3. Install dependencies: `npm install`
4. Run local development server

## Project Structure
```
├── infrastructure/          # CloudFormation templates
├── lambda-functions/       # Lambda function code
├── frontend/              # React web application
├── database/              # Database schemas and seed data
└── docs/                  # Documentation
```
