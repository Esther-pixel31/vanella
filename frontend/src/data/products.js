const PRODUCT_IMAGE_20L = require('../../assets/images/product-20l.png');
const PRODUCT_IMAGE_BULK = require('../../assets/images/product-6000l.png');

// The backend sends no product images yet, so pictures and button labels
// are chosen here from the product type.
export function toProductCard(product) {
  const isBulk = product.product_type !== '20L';

  return {
    id: product.id,
    // Break bulk names onto two lines: "6,000L" / "Bulk Water".
    name: product.name.replace(' Bulk Water', '\nBulk Water'),
    price: Number(product.price),
    image: isBulk ? PRODUCT_IMAGE_BULK : PRODUCT_IMAGE_20L,
    action: isBulk ? 'Order Now' : 'Add to Order',
    isBulk,
  };
}
