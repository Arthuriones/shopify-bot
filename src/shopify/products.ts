import {
  shopifyGet,
  shopifyPost,
  shopifyPut,
  shopifyDelete,
} from "./client.js";
import { logger } from "../utils/logger.js";

interface ShopifyProduct {
  id: number;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  status: string;
  variants: Array<{
    id: number;
    price: string;
    inventory_quantity: number;
    sku: string;
  }>;
  images: Array<{ id: number; src: string }>;
}

interface ProductList {
  products: ShopifyProduct[];
}
interface ProductSingle {
  product: ShopifyProduct;
}

export async function listProducts(limit = 10): Promise<string> {
  const res = await shopifyGet<ProductList>(
    `/products.json?limit=${limit}&status=active`
  );
  if (res.error) return `Erro: ${res.error}`;

  const products = res.data?.products ?? [];
  if (products.length === 0) return "Nenhum produto encontrado.";

  return products
    .map((p) => {
      const price = p.variants[0]?.price ?? "N/A";
      const stock = p.variants[0]?.inventory_quantity ?? 0;
      return `• ${p.title} — R$${price} (${stock} un) [ID: ${p.id}]`;
    })
    .join("\n");
}

export async function getProduct(productId: number): Promise<string> {
  const res = await shopifyGet<ProductSingle>(
    `/products/${productId}.json`
  );
  if (res.error) return `Erro: ${res.error}`;

  const p = res.data?.product;
  if (!p) return "Produto não encontrado.";

  const variant = p.variants[0];
  return [
    `<b>${p.title}</b>`,
    `Preço: R$${variant?.price ?? "N/A"}`,
    `Estoque: ${variant?.inventory_quantity ?? 0} un`,
    `Status: ${p.status}`,
    `SKU: ${variant?.sku || "sem SKU"}`,
    `ID: ${p.id}`,
  ].join("\n");
}

export async function createProduct(params: {
  title: string;
  price: string;
  quantity?: number;
  description?: string;
  vendor?: string;
  productType?: string;
}): Promise<string> {
  const body = {
    product: {
      title: params.title,
      body_html: params.description ?? "",
      vendor: params.vendor ?? "",
      product_type: params.productType ?? "",
      status: "active",
      variants: [
        {
          price: params.price,
          inventory_management: "shopify",
          inventory_quantity: params.quantity ?? 0,
        },
      ],
    },
  };

  const res = await shopifyPost<ProductSingle>("/products.json", body);
  if (res.error) return `Erro ao criar: ${res.error}`;

  const p = res.data?.product;
  if (!p) return "Erro: resposta inesperada da Shopify.";

  logger.info("Product created", { productId: p.id, title: p.title });
  return `Produto criado: <b>${p.title}</b> — R$${params.price} [ID: ${p.id}]`;
}

export async function updateProduct(
  productId: number,
  updates: {
    title?: string;
    price?: string;
    description?: string;
    status?: "active" | "draft" | "archived";
  }
): Promise<string> {
  const body: Record<string, unknown> = {};
  if (updates.title) body.title = updates.title;
  if (updates.description) body.body_html = updates.description;
  if (updates.status) body.status = updates.status;

  // Update product base fields
  if (Object.keys(body).length > 0) {
    const res = await shopifyPut<ProductSingle>(
      `/products/${productId}.json`,
      { product: { id: productId, ...body } }
    );
    if (res.error) return `Erro ao atualizar: ${res.error}`;
  }

  // Update price via variant
  if (updates.price) {
    const prod = await shopifyGet<ProductSingle>(
      `/products/${productId}.json`
    );
    const variantId = prod.data?.product.variants[0]?.id;
    if (variantId) {
      await shopifyPut(
        `/variants/${variantId}.json`,
        { variant: { id: variantId, price: updates.price } }
      );
    }
  }

  logger.info("Product updated", { productId, updates });
  return `Produto ${productId} atualizado.`;
}

export async function deleteProduct(productId: number): Promise<string> {
  const res = await shopifyDelete(`/products/${productId}.json`);
  if (res.error) return `Erro ao deletar: ${res.error}`;

  logger.info("Product deleted", { productId });
  return `Produto ${productId} deletado.`;
}

export async function searchProducts(searchTerm: string): Promise<string> {
  const res = await shopifyGet<ProductList>(
    `/products.json?title=${encodeURIComponent(searchTerm)}&limit=10`
  );
  if (res.error) return `Erro: ${res.error}`;

  const products = res.data?.products ?? [];
  if (products.length === 0)
    return `Nenhum produto encontrado para "${searchTerm}".`;

  return products
    .map((p) => {
      const price = p.variants[0]?.price ?? "N/A";
      return `• ${p.title} — R$${price} [ID: ${p.id}]`;
    })
    .join("\n");
}
