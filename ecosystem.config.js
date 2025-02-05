module.exports = {
  apps: [
    {
      name: "fm_backend",
      script: "./index.js",
      env_production: {
        NODE_ENV: "production",
        PORT: 3050,
        DATABASE_URL:
          "mysql://root:Password@123@localhost:3306/student_management",
        JWT_SECRET:
          "uwyiausa887ahs92dc861a4f0eeiusiq98w9qjsiqsjqwuqi9899qiwq8990674ba3f09a1d58f97e19a025kjoiwoq89w89qwoiwqc3bf1a",
        PASSWORD_ENCRYPT_KEY:
          "3d09c8b30cf4983ab8d2128e93267fe5a9943fd98feb02c09390fa504ec77c29",
        PASSWORD_SALT_ROUNDS: 10,
        RESET_PASSWORD_FRONTEND_HOST_ADMIN:
          "https://admin.vlmhss.edu.in/reset-password/",
        RESET_PASSWORD_FRONTEND_HOST_TEACHER:
          "https://teacher.vlmhss.edu.in/reset-password/",
        RESET_PASSWORD_FRONTEND_HOST_PARENT:
          "https://parent.vlmhss.edu.in/reset-password/",
        SMTP_HOST: "smtppro.zoho.in",
        SMTP_PORT: "465",
        SMTP_EMAIL: "noreply@vlmhss.edu.in",
        SMTP_PASSWORD: "zXngs8$d",
        PG_BASE_URL: "https://api-preprod.phonepe.com/apis/pg-sandbox",
        PG_REDIRECT_URL: "http://localhost:3000/fees/payments",
        PG_WEBHOOKS_URL: "http://localhost:3050/fees/webhooks",
        RAZORPAY_SECRET: "BOFzFFc1TCAyWskD2kIBAChE",
        RAZORPAY_KEY_ID: "rzp_live_CEoPlK1BTopDBr",
        RP_WEBHOOK_SECRET: "a66d96be-9033-4d9d-8714-ab7de11c5b38",
        RP_MERCHENT_ID: "JVoztnRSq8i1lg",
        LYRA_SHOP_ID: "51634323",
        LYRA_API_KEY:
          "prodpassword_UjRSBf97i66kMujgDfp8dr2aWgmjvZjDWIOkraODPpag2",
        LYRA_BASE_URL: "https://api.in.lyra.com",
        PARENT_FRONT_END_URL: "https://parent.vlmhss.edu.in/dashboard",
        BACKEND_BASE_URL: "https://api.vlmhss.edu.in",
      },
      env_uat: {
        NODE_ENV: "uat",
        PORT: 3050,
        DATABASE_URL:
          "mysql://root:password@123@localhost:3306/student_management",
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
        LYRA_SHOP_ID: "51634323",
        LYRA_API_KEY:
          "testpassword_QEg6Xx30HqEZNlKSZ4wBE8Oh5d1TG1atIBY6gMIcAZJDX",
        LYRA_BASE_URL: "https://api.in.lyra.com",
        PARENT_FRONT_END_URL: "http://localhost:3000/dashboard",
        BACKEND_BASE_URL:
          "https://f36a-2409-40f4-29-63c1-8832-8c23-401c-fa39.ngrok-free.app",
      },
      env_dev: {
        NODE_ENV: "uat",
        PORT: 3050,
        DATABASE_URL:
          "mysql://root:password@123@localhost:3306/student_management",
        JWT_SECRET:
          "c52bba2d3021547a9f92dc861a4f0ee44f1d72d6edac093a0ee224290362f6043a27e7b8c459fe02180674ba3f09a1d58f97e19a025ecc983fd75cfd1ac3bf1a",
        PASSWORD_ENCRYPT_KEY:
          "3d09c8b30cf4983ab8d2128e93267fe5a9943fd98feb02c09390fa504ec77c29",
        PASSWORD_SALT_ROUNDS: 10,
        RESET_PASSWORD_FRONTEND_HOST_ADMIN:
          "http://demo-fm-admin.tech42.in/reset-password/",
        RESET_PASSWORD_FRONTEND_HOST_TEACHER:
          "http://demo-fm-teacher.tech42.in/reset-password/",
        RESET_PASSWORD_FRONTEND_HOST_PARENT:
          "http://demo-fm-parent.tech42.in/reset-password/",
        SMTP_HOST: "smtppro.zoho.in",
        SMTP_PORT: "465",
        SMTP_EMAIL: "support@tech42.in",
        SMTP_PASSWORD: "q9*qmtUk",
        PG_BASE_URL: "https://api-preprod.phonepe.com/apis/pg-sandbox",
        PG_REDIRECT_URL: "http://localhost:3000/fees/payments",
        PG_WEBHOOKS_URL: "http://localhost:3050/fees/webhooks",
        RAZORPAY_SECRET: "sr43VLecajfqljry6EkSkEKQ",
        RAZORPAY_KEY_ID: "rzp_test_chuP0tLcsp9D5v",
        RP_WEBHOOK_SECRET: "b008613e-007f-4a90-beee-7899d38b4efb",
        RP_MERCHENT_ID: "JVoztnRSq8i1lg",
        LYRA_SHOP_ID: "51634323",
        LYRA_API_KEY:
          "testpassword_QEg6Xx30HqEZNlKSZ4wBE8Oh5d1TG1atIBY6gMIcAZJDX",
        LYRA_BASE_URL: "https://api.in.lyra.com",
        PARENT_FRONT_END_URL: "http://demo-fm-parent.tech42.in/dashboard",
        BACKEND_BASE_URL: "https://demo-fm-api.tech42.in",
      },
    },
  ],
};
