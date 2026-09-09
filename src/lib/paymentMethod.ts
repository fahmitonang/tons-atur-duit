export type PaymentMethodType = 
  | "CASH" 
  | "QRIS" 
  | "TRANSFER" 
  | "DEBIT_CARD" 
  | "CREDIT_CARD" 
  | "EWALLET" 
  | "OTHER";

export interface PaymentMethodOption {
  id: PaymentMethodType;
  label: string;
  shortLabel: string;
  iconName: string;
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  { id: "CASH", label: "Uang Tunai (Cash)", shortLabel: "Tunai", iconName: "Banknote" },
  { id: "QRIS", label: "QRIS", shortLabel: "QRIS", iconName: "QrCode" },
  { id: "TRANSFER", label: "Transfer Bank / VA", shortLabel: "Transfer", iconName: "ArrowRightLeft" },
  { id: "DEBIT_CARD", label: "Kartu Debit / EDC", shortLabel: "Debit", iconName: "CreditCard" },
  { id: "CREDIT_CARD", label: "Kartu Kredit", shortLabel: "Kredit", iconName: "CreditCard" },
  { id: "EWALLET", label: "Saldo E-Wallet", shortLabel: "E-Wallet", iconName: "Smartphone" },
  { id: "OTHER", label: "Lainnya", shortLabel: "Lainnya", iconName: "MoreHorizontal" },
];

export function getPaymentMethodLabel(method?: string | null): string {
  if (!method) return "Tunai";
  const found = PAYMENT_METHODS.find(p => p.id === method);
  return found ? found.shortLabel : method;
}

