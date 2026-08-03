# Guía de Looker Studio para GA4

## Conectar la propiedad

1. Abre Looker Studio y elige **Crear → Informe**.
2. Selecciona **Añadir datos → Google Analytics**.
3. Selecciona la cuenta y la propiedad asociada a `G-SQMS3V5EBQ`.
4. Añádela al informe.
5. Cuando las definiciones personalizadas ya aparezcan en GA4, abre la fuente de datos y pulsa **Actualizar campos**.

Looker Studio consulta datos procesados de GA4; no consulta DebugView. Los nombres exactos pueden variar según el idioma del conector.

## Campos estándar para productos

Usa los campos del conector derivados de Enhanced Ecommerce:

- ID del artículo (`item_id`)
- Nombre del artículo (`item_name`)
- Marca del artículo (`item_brand`)
- Categoría del artículo (`item_category`)
- Categoría del artículo 2 (`item_category2`, usada como colección)
- Variante del artículo (`item_variant`)
- Precio del artículo (`price`)
- Cantidad del artículo (`quantity`)
- Nombre de lista de artículos (`item_list_name`)
- ID de lista de artículos (`item_list_id`)
- Valor del evento (`value`)

No busques dimensiones `product_name` o `product_brand`: se eliminaron intencionalmente porque duplicaban las dimensiones estándar de artículo.

## Diseño recomendado

### 1. Resumen ejecutivo

- Usuarios, sesiones y vistas de página.
- Productos vistos: recuento de `view_item`.
- Productos agregados: recuento de `add_to_cart` y cantidad de artículos.
- Intentos de finalizar: recuento de `begin_checkout`.
- Contactos por WhatsApp: recuento de `whatsapp_click`.
- Embudo: `page_view → view_item → add_to_cart → view_cart → begin_checkout → whatsapp_click`.

### 2. Productos

- Productos más vistos: Nombre, Marca, Categoría, Categoría 2/Colección y recuento de `view_item`.
- Productos seleccionados: Nombre, Lista y recuento de `select_item`.
- Productos agregados: Nombre, Cantidad de artículos y Valor del evento, filtrado por `add_to_cart`.
- Productos retirados: Nombre, Cantidad de artículos, Tipo de retirada y Valor del evento, filtrado por `remove_from_cart`.

### 3. Búsquedas y filtros

- Término de búsqueda y recuento de `search`.
- Término de búsqueda y recuento de `search_no_results`.
- Tipo/valor/origen del filtro, recuento y promedio de Cantidad de resultados.
- Orden aplicado y recuento de `sort_apply`.

### 4. Carrito y conversión

- Recuentos de `add_to_cart`, `remove_from_cart`, `view_cart`, `begin_checkout` y `whatsapp_click`.
- Suma de Cantidad de artículos para agregados y retirados.
- Suma o promedio de Valor del evento para carrito y checkout.
- Tabla por Nombre del artículo con agregados, retirados y diferencia neta.

### 5. Contenido y navegación

- Nombre de sección, Nombre de página comercial y recuento de `section_view`.
- Nombre del botón, sección, página y recuento de `button_click`.
- Categorías, colecciones y bebidas seleccionadas.
- Porcentaje desplazado por página.

## Campos calculados conceptuales

```text
CASE
  WHEN Event name = "page_view" THEN "Visita a página"
  WHEN Event name = "view_item" THEN "Producto visto"
  WHEN Event name = "select_item" THEN "Producto seleccionado"
  WHEN Event name = "add_to_cart" THEN "Producto agregado al carrito"
  WHEN Event name = "remove_from_cart" THEN "Producto retirado del carrito"
  WHEN Event name = "view_cart" THEN "Carrito abierto"
  WHEN Event name = "begin_checkout" THEN "Inicio de compra"
  WHEN Event name = "whatsapp_click" THEN "Clic en WhatsApp"
  ELSE Event name
END
```

Las relaciones recomendadas son:

- Conversión a carrito = eventos `add_to_cart` / eventos `view_item`.
- Conversión a WhatsApp = eventos `whatsapp_click` / eventos `begin_checkout`.
- Tasa sin resultados = eventos `search_no_results` / eventos `search`.
- Diferencia neta de unidades = Cantidad de artículos agregada − Cantidad de artículos retirada.
- Valor promedio del carrito = promedio de Valor del evento filtrado por `view_cart`.

Si el conector no permite métricas filtradas en una fórmula, crea gráficos con filtros de evento o combina dos fuentes derivadas de la misma propiedad.

## Compatibilidad y límites

- Los eventos recomendados usan el esquema oficial de Enhanced Ecommerce.
- Los parámetros propios solo aparecen como campos después de crear su definición personalizada.
- Todas las definiciones actuales son de ámbito Evento; no hay propiedades de usuario.
- Las definiciones no son retroactivas.
- GA4 y Looker Studio pueden tardar entre 24 y 48 horas en mostrar campos y datos procesados.
- Los filtros internos usan nombres técnicos; los títulos visibles del panel deben permanecer en español.
