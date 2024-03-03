module.exports = {
  apps: [
    {
      name: "fm_backend",
      script: "./index.js",
      env_production: {
        NODE_ENV: "PROD",
        PORT: 3050,
        DATABASE_URL:
          "mysql://surya:Admin@123@localhost:3306/student_management",
        JWT_SECRET:
          "c52bba2d3021547a9f92dc861a4f0ee44f1d72d6edac093a0ee224290362f6043a27e7b8c459fe02180674ba3f09a1d58f97e19a025ecc983fd75cfd1ac3bf1a",
        PASSWORD_ENCRYPT_KEY:
          "3d09c8b30cf4983ab8d2128e93267fe5a9943fd98feb02c09390fa504ec77c29",
        PASSWORD_SALT_ROUNDS: 10,
        RESET_PASSWORD_FRONTEND_HOST: "http://localhost:3000/reset-password/",
        SMTP_HOST: "smtppro.zoho.in",
        SMTP_PORT: "465",
        SMTP_EMAIL: "sales@eclatsoftwaresolutions.com",
        SMTP_PASSWORD: "Suryakamal@3211",
        PG_BASE_URL: "https://api-preprod.phonepe.com/apis/pg-sandbox",
        PG_REDIRECT_URL: "http://localhost:3000/fees/payments",
        PG_WEBHOOKS_URL: "http://localhost:3050/fees/webhooks",
        RP_SECRET: "sr43VLecajfqljry6EkSkEKQ",
        RP_KEY_ID: "rzp_test_chuP0tLcsp9D5v",
        RP_WEBHOOK_SECRET: "b008613e-007f-4a90-beee-7899d38b4efb",
        RP_MERCHENT_ID: "JVoztnRSq8i1lg",
      },
      env_uat: {
        NODE_ENV: "uat",
        PORT: 3050,
        DATABASE_URL:
          "mysql://surya:Admin@123@localhost:3306/student_management",
        JWT_SECRET:
          "c52bba2d3021547a9f92dc861a4f0ee44f1d72d6edac093a0ee224290362f6043a27e7b8c459fe02180674ba3f09a1d58f97e19a025ecc983fd75cfd1ac3bf1a",
        PASSWORD_ENCRYPT_KEY:
          "3d09c8b30cf4983ab8d2128e93267fe5a9943fd98feb02c09390fa504ec77c29",
        PASSWORD_SALT_ROUNDS: 10,
        RESET_PASSWORD_FRONTEND_HOST_ADMIN:
          "http://testadmin.tech42.in/reset-password/",
        RESET_PASSWORD_FRONTEND_HOST_TEACHER:
          "http://testteacher.tech42.in/reset-password/",
        RESET_PASSWORD_FRONTEND_HOST_PARENT:
          "http://testparent.tech42.in/reset-password/",
        SMTP_HOST: "smtppro.zoho.in",
        SMTP_PORT: "465",
        SMTP_EMAIL: "noreply@vlmhss.edu.in",
        SMTP_PASSWORD: "zXngs8$d",
        PG_BASE_URL: "https://api-preprod.phonepe.com/apis/pg-sandbox",
        PG_REDIRECT_URL: "http://localhost:3000/fees/payments",
        PG_WEBHOOKS_URL: "http://localhost:3050/fees/webhooks",
        RAZORPAY_SECRET: "sr43VLecajfqljry6EkSkEKQ",
        RAZORPAY_KEY_ID: "rzp_test_chuP0tLcsp9D5v",
        RP_WEBHOOK_SECRET: "b008613e-007f-4a90-beee-7899d38b4efb",
        RP_MERCHENT_ID: "JVoztnRSq8i1lg",
      },
    },
  ],
};
