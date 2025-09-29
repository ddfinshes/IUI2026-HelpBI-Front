-- 用户复杂查询:
-- “查询2022年四川省的销售数据，选择门店和销售额字段。只保留销售额大于500的记录，并且将销售额转为‘高销量/低销量’类别。将这些结果和客户表进行连接，按门店分组统计平均销售额，
-- 并计算每个门店的订单数量。最后按平均销售额排序，取前5个门店，并给它们的平均销售额做排名。”

SELECT 
    s.store,
    CASE WHEN s.sales > 1000 THEN '高销量' ELSE '低销量' END AS sales_level,
    AVG(s.sales) AS avg_sales,
    COUNT(o.order_id) AS order_count,
    RANK() OVER (ORDER BY AVG(s.sales) DESC) AS sales_rank
FROM sales_table s
JOIN customer_orders o ON s.order_id = o.order_id
WHERE s.province = '四川省'
  AND YEAR(s.date) = 2022
  AND s.sales > 500
GROUP BY s.store, sales_level
ORDER BY avg_sales DESC
LIMIT 5;

