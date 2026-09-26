// Professional Hospital Payment Modal Component
import { toast } from '../feedback/feedback';
import React, { useState } from "react";
import { createOrder, verifyPayment } from "../../api";
import { useSelector } from "react-redux";

// Professional Hospital Payment Styles
const styles = {
  // Modal Overlay
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.6)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },

  // Main Modal Container
  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.2)",
    overflow: "hidden",
    maxWidth: "500px",
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
  },

  // Header Section
  header: {
    background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
    padding: "2rem",
    textAlign: "center",
    position: "relative",
  },
  headerIcon: {
    width: "80px",
    height: "80px",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 1rem",
    fontSize: "40px",
    backdropFilter: "blur(10px)",
  },
  headerTitle: {
    fontSize: "1.75rem",
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: "0.5rem",
  },
  headerSubtitle: {
    fontSize: "1rem",
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },

  // Close Button
  closeButton: {
    position: "absolute",
    top: "1rem",
    right: "1rem",
    background: "rgba(255, 255, 255, 0.2)",
    border: "none",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "20px",
    transition: "all 0.2s ease",
  },
  closeButtonHover: {
    background: "rgba(255, 255, 255, 0.3)",
    transform: "scale(1.1)",
  },

  // Content Section
  content: {
    padding: "2rem",
  },

  // Patient Info Card
  patientCard: {
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "2rem",
    border: "1px solid #e2e8f0",
  },
  patientHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "1rem",
  },
  patientIcon: {
    width: "48px",
    height: "48px",
    backgroundColor: "#eff6ff",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#3b82f6",
    fontSize: "24px",
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: "1.25rem",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "0.25rem",
  },
  patientMeta: {
    fontSize: "0.875rem",
    color: "#6b7280",
  },
  balanceCard: {
    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
    borderRadius: "12px",
    padding: "1.5rem",
    textAlign: "center",
    color: "#ffffff",
    marginBottom: "2rem",
  },
  balanceLabel: {
    fontSize: "0.875rem",
    opacity: 0.9,
    marginBottom: "0.5rem",
    fontWeight: "500",
  },
  balanceAmount: {
    fontSize: "2rem",
    fontWeight: "800",
  },

  // Amount Selection
  amountSection: {
    marginBottom: "2rem",
  },
  sectionTitle: {
    fontSize: "1.125rem",
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: "1rem",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  quickAmounts: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: "0.75rem",
    marginBottom: "1.5rem",
  },
  amountButton: {
    padding: "0.75rem 1rem",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    backgroundColor: "#ffffff",
    color: "#374151",
    fontSize: "0.875rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    textAlign: "center",
  },
  amountButtonActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
    color: "#ffffff",
  },
  amountInput: {
    width: "100%",
    padding: "0.875rem 1rem",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "1rem",
    color: "#1f2937",
    backgroundColor: "#ffffff",
    outline: "none",
    transition: "all 0.2s ease",
    fontFamily: "inherit",
    textAlign: "center",
    fontWeight: "600",
  },
  amountInputFocus: {
    borderColor: "#3b82f6",
    boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
  },

  // Security Notice
  securityNotice: {
    backgroundColor: "#fef3c7",
    border: "1px solid #f59e0b",
    borderRadius: "8px",
    padding: "1rem",
    marginBottom: "2rem",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  },
  securityIcon: {
    color: "#d97706",
    fontSize: "20px",
  },
  securityText: {
    fontSize: "0.875rem",
    color: "#92400e",
    fontWeight: "500",
    margin: 0,
  },

  // Action Buttons
  buttonGroup: {
    display: "flex",
    gap: "1rem",
    justifyContent: "space-between",
  },
  cancelButton: {
    flex: 1,
    padding: "0.875rem 1.5rem",
    backgroundColor: "#ffffff",
    color: "#6b7280",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  cancelButtonHover: {
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
  },
  payButton: {
    flex: 1,
    padding: "0.875rem 1.5rem",
    background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  },
  payButtonHover: {
    transform: "translateY(-1px)",
    boxShadow: "0 4px 16px rgba(59, 130, 246, 0.3)",
  },
  payButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    transform: "none",
  },

  // Loading Spinner
  loadingSpinner: {
    width: "20px",
    height: "20px",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTop: "2px solid #ffffff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  // Responsive Design
  "@media (max-width: 640px)": {
    overlay: {
      padding: "0.5rem",
    },
    header: {
      padding: "1.5rem",
    },
    headerTitle: {
      fontSize: "1.5rem",
    },
    content: {
      padding: "1.5rem",
    },
    buttonGroup: {
      flexDirection: "column",
    },
    quickAmounts: {
      gridTemplateColumns: "repeat(3, 1fr)",
    },
  },
};

export default function PaymentModal({ patient, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("authToken");
  const { user: donor } = useSelector((state) => state.auth);

  const quickAmounts = [500, 1000, 2000, 5000, 10000];

  const handleQuickAmountSelect = (selectedAmount) => {
    setAmount(selectedAmount.toString());
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value) => {
    setAmount(value);
    setCustomAmount(value);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  async function handlePay(e) {
    e.preventDefault();

    const paymentAmount = Number(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      toast.warning("Please enter a valid donation amount.", "Check the amount");
      return;
    }

    if (paymentAmount > patient.balance_amount) {
      toast.warning(
        `The amount can’t be more than the remaining balance of ${formatCurrency(patient.balance_amount)}.`,
        "Check the amount"
      );
      return;
    }

    setLoading(true);
    try {
      // ✅ Backend returns { order_id, amount, currency, key_id }
      const orderResp = await createOrder(token, paymentAmount);

      const options = {
        key: orderResp.key_id,
        amount: orderResp.amount,
        currency: orderResp.currency,
        name: "Medical Portal - Hospital Donation",
        description: `Donation for ${patient.name}`,
        order_id: orderResp.order_id,
        image: "https://cdn-icons-png.flaticon.com/512/2784/2784931.png",

        handler: async function (res) {
          try {
            console.log(res, "payment response");
            const verifyResp = await verifyPayment(token, {
              razorpay_order_id: res.razorpay_order_id,
              razorpay_payment_id: res.razorpay_payment_id,
              razorpay_signature: res.razorpay_signature,
              patient_id: patient.id,
              patient_name: patient.name,
              donor_id: donor._id,
              donor_name: donor.name,
              amount: paymentAmount,
            });

            console.log("Payment verification successful:", verifyResp);
            toast.success(`Thank you for supporting ${patient.name}.`, "Donation successful");
            onSuccess();
          } catch (err) {
            console.error("Payment verification failed:", err);
            toast.error(
              "Please contact support if the amount was deducted.",
              "Payment verification failed"
            );
          }
        },

        prefill: {
          name: donor.name,
          email: donor.email,
          contact: donor.mobile,
        },
        notes: {
          patient_name: patient.name,
          patient_id: patient.id,
        },
        theme: {
          color: "#3b82f6",
          backdrop_color: "#1e40af",
        },
        modal: {
          backdropclose: false,
          escape: false,
          confirm_close: true,
          animation: true,
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.success", function (response) {
        console.log("Payment completed successfully:", response);
      });

      rzp.on("payment.failed", function (resp) {
        console.error("Payment failed:", resp.error);
        toast.error(resp.error?.description || "Unknown error occurred.", "Payment failed");
      });

      rzp.on("payment.cancel", function () {
        console.log("Payment was cancelled by user");
      });

      rzp.open();
    } catch (err) {
      console.error("Failed to create payment order:", err);
      toast.error(err?.error || "Please try again.", "Couldn’t start payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* CSS Animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Modal Overlay */}
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
          {/* Header Section */}
          <div style={styles.header}>
            <div style={styles.headerIcon}>💝</div>
            <h1 style={styles.headerTitle}>Make a Donation</h1>
            <p style={styles.headerSubtitle}>
              Your generosity helps patients access essential medical care
            </p>

            <button
              style={styles.closeButton}
              onClick={onClose}
              onMouseOver={(e) =>
                Object.assign(e.target.style, styles.closeButtonHover)
              }
              onMouseOut={(e) =>
                Object.assign(e.target.style, styles.closeButton)
              }
            >
              ×
            </button>
          </div>

          {/* Content Section */}
          <div style={styles.content}>
            {/* Patient Information Card */}
            <div style={styles.patientCard}>
              <div style={styles.patientHeader}>
                <div style={styles.patientIcon}>👨‍⚕️</div>
                <div style={styles.patientInfo}>
                  <h2 style={styles.patientName}>{patient.name}</h2>
                  <p style={styles.patientMeta}>
                    Patient ID: {patient.id || patient._id}
                  </p>
                </div>
              </div>
            </div>

            {/* Balance Information */}
            <div style={styles.balanceCard}>
              <div style={styles.balanceLabel}>Remaining Amount Needed</div>
              <div style={styles.balanceAmount}>
                {formatCurrency(patient.balance_amount)}
              </div>
            </div>

            {/* Amount Selection */}
            <div style={styles.amountSection}>
              <h3 style={styles.sectionTitle}>
                <span>💰</span>
                Select Donation Amount
              </h3>

              {/* Quick Amount Buttons */}
              <div style={styles.quickAmounts}>
                {quickAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    style={{
                      ...styles.amountButton,
                      ...(amount === amt.toString()
                        ? styles.amountButtonActive
                        : {}),
                    }}
                    onClick={() => handleQuickAmountSelect(amt)}
                    disabled={loading}
                  >
                    ₹{amt.toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Custom Amount Input */}
              <input
                type="number"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                placeholder="Or enter custom amount"
                style={styles.amountInput}
                min="1"
                max={patient.balance_amount}
                onFocus={(e) =>
                  Object.assign(e.target.style, styles.amountInputFocus)
                }
                onBlur={(e) =>
                  Object.assign(e.target.style, styles.amountInput)
                }
                disabled={loading}
              />
            </div>

            {/* Security Notice */}
            <div style={styles.securityNotice}>
              <span style={styles.securityIcon}>🔒</span>
              <p style={styles.securityText}>
                Your payment is secured with 256-bit SSL encryption and
                processed through Razorpay's secure gateway.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={styles.buttonGroup}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={onClose}
                disabled={loading}
                onMouseOver={(e) =>
                  Object.assign(e.target.style, styles.cancelButtonHover)
                }
                onMouseOut={(e) =>
                  Object.assign(e.target.style, styles.cancelButton)
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                style={{
                  ...styles.payButton,
                  ...(loading ? styles.payButtonDisabled : {}),
                }}
                onClick={handlePay}
                disabled={loading || !amount || Number(amount) <= 0}
                onMouseOver={(e) => {
                  if (!loading)
                    Object.assign(e.target.style, styles.payButtonHover);
                }}
                onMouseOut={(e) => {
                  if (!loading) Object.assign(e.target.style, styles.payButton);
                }}
              >
                {loading ? (
                  <>
                    <div style={styles.loadingSpinner}></div>
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <span>💳</span>
                    Donate {amount ? formatCurrency(Number(amount)) : ""}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
