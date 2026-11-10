export type OfflineProduct = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  selling_price: number;
  current_stock: number;
};

export type QueuedSale = {
  id: string;
  invoiceNumber: string;
  discount: number;
  tax: number;
  paymentMethod: "cash" | "card" | "bank_transfer" | "credit" | "other";
  paymentStatus: "paid" | "partial" | "unpaid";
  customerId: string;
  amountPaid: number;
  items: { product_id: string; quantity: number }[];
  createdAt: string;
};

const databaseName = "banday-mart-offline";
const databaseVersion = 1;
const productsStore = "products";
const salesStore = "sales";

function databaseNameForShop(shopId: string) {
  return `${databaseName}-${shopId}`;
}

function openDatabase(shopId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseNameForShop(shopId), databaseVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(productsStore)) database.createObjectStore(productsStore, { keyPath: "id" });
      if (!database.objectStoreNames.contains(salesStore)) database.createObjectStore(salesStore, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline storage."));
  });
}

export async function cacheProducts(shopId: string, products: OfflineProduct[]) {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase(shopId);
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(productsStore, "readwrite");
    const store = transaction.objectStore(productsStore);
    products.forEach((product) => store.put(product));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not cache products."));
  });
  database.close();
}

export async function readCachedProducts(shopId: string): Promise<OfflineProduct[]> {
  if (typeof indexedDB === "undefined") return [];
  const database = await openDatabase(shopId);
  const products = await new Promise<OfflineProduct[]>((resolve, reject) => {
    const request = database.transaction(productsStore, "readonly").objectStore(productsStore).getAll();
    request.onsuccess = () => resolve(request.result as OfflineProduct[]);
    request.onerror = () => reject(request.error ?? new Error("Could not read cached products."));
  });
  database.close();
  return products;
}

export async function queueSale(shopId: string, sale: QueuedSale) {
  if (typeof indexedDB === "undefined") throw new Error("Offline storage is not available in this browser.");
  const database = await openDatabase(shopId);
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(salesStore, "readwrite");
    transaction.objectStore(salesStore).put(sale);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the offline sale."));
  });
  database.close();
}

export async function readQueuedSales(shopId: string): Promise<QueuedSale[]> {
  if (typeof indexedDB === "undefined") return [];
  const database = await openDatabase(shopId);
  const sales = await new Promise<QueuedSale[]>((resolve, reject) => {
    const request = database.transaction(salesStore, "readonly").objectStore(salesStore).getAll();
    request.onsuccess = () => resolve(request.result as QueuedSale[]);
    request.onerror = () => reject(request.error ?? new Error("Could not read queued sales."));
  });
  database.close();
  return sales.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function removeQueuedSale(shopId: string, id: string) {
  if (typeof indexedDB === "undefined") return;
  const database = await openDatabase(shopId);
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(salesStore, "readwrite");
    transaction.objectStore(salesStore).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not remove the synced sale."));
  });
  database.close();
}
