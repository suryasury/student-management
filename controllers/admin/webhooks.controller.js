const httpStatus = require("http-status");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const error = require("../../helpers/errorHandler");
let crypto = require("crypto");

exports.paymentWebHooks = async (req, res) => {
  try {
    let paymentDetails = req.body;

    const shasum = crypto.createHmac("sha256", process.env.RP_WEBHOOK_SECRET);

    shasum.update(JSON.stringify(paymentDetails));

    const digest = shasum.digest("hex");

    if (digest === req.headers["x-razorpay-signature"]) {
      let event = paymentDetails.event;

      if (event === "payment.captured") {
        let paymentResponse = paymentDetails.payload.payment.entity;

        let notesObj = paymentResponse.notes;

        let feesIds = Object.values(notesObj);
        await Promise.allSettled(
          feesIds.map((id) => {
            return new Promise(async (resolve, reject) => {
              try {
                let feesDetails = await prisma.fees_details.update({
                  where: {
                    id,
                  },
                  data: {
                    is_paid: true,
                    payed_through: "Online",
                  },
                });
                let feesTransactions = await prisma.fees_transaction.findFirst({
                  where: {
                    fee_detail_id: feesDetails.id,
                    school_id: feesDetails.school_id,
                  },
                });
                if (!feesTransactions) {
                  await prisma.fees_transaction.create({
                    data: {
                      fee_detail_id: id,
                      amount_paid: feesDetails.total_payable,
                      transaction_date: new Date(),
                      payment_mode: paymentResponse.method.toUpperCase(),
                      wallet_provider: (
                        paymentResponse.wallet || ""
                      ).toUpperCase(),
                      school_id: feesDetails.school_id,
                      pg_gateway: "RAZORPAY",
                      order_id: paymentResponse.order_id,
                      payment_id: paymentResponse.id,
                    },
                  });
                }
                resolve();
              } catch (err) {
                reject(err);
              }
            });
          }),
        );
      }
      return res.status(200).send({
        success: true,
        message: "Success",
        data: {},
      });
    } else {
      return res.status(400).send({
        success: false,
        message: "Signature doesnt match",
        data: {},
      });
    }
  } catch (err) {
    console.log("errr", err);
    error(err, res);
  }
};

exports.paymentWebHooksLyra = async (req, res) => {
  try {
    let paymentDetails = req.body;
    if (paymentDetails.status === "PAID") {
      let feesIds = paymentDetails.udf;
      feesIds = feesIds.map(Number);

      await Promise.allSettled(
        feesIds.map((id) => {
          return new Promise(async (resolve, reject) => {
            try {
              let feesDetails = await prisma.fees_details.update({
                where: {
                  id,
                },
                data: {
                  is_paid: true,
                  payed_through: "Online",
                },
              });
              let feesTransactions = await prisma.fees_transaction.findFirst({
                where: {
                  fee_detail_id: feesDetails.id,
                  school_id: feesDetails.school_id,
                },
              });
              let teansaction = paymentDetails.transactions.find(
                (item) => item.status === "ACCEPTED",
              );
              if (!feesTransactions) {
                await prisma.fees_transaction.create({
                  data: {
                    fee_detail_id: id,
                    amount_paid: feesDetails.total_payable,
                    transaction_date: new Date(),
                    payment_mode: teansaction.family.toUpperCase(),
                    wallet_provider: (teansaction.wallet || "").toUpperCase(),
                    school_id: feesDetails.school_id,
                    pg_gateway: "LYRA",
                    order_id: paymentDetails.orderId,
                    payment_id: paymentDetails.uuid,
                  },
                });
              }
              resolve();
            } catch (err) {
              reject(err);
            }
          });
        }),
      );
    }
    return res.status(httpStatus.OK).send({
      success: true,
      message: "Success",
      data: {},
    });
  } catch (err) {
    console.log("errr", err);
    error(err, res);
  }
};
