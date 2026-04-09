INSERT INTO public.product_variations (product_id, name, price, cost_price)
SELECT p.id, 'ברירת מחדל', p.sale_price, p.cost_price
FROM products p
JOIN bundles b ON b.product_id = p.id
LEFT JOIN product_variations pv ON pv.product_id = p.id
WHERE pv.id IS NULL
GROUP BY p.id, p.sale_price, p.cost_price;