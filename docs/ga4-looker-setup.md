# GA4 Enhanced Ecommerce y definiciones personalizadas

Propiedad web: `G-SQMS3V5EBQ`.

## Implementación estándar de comercio electrónico

Los eventos recomendados conservan exclusivamente los parámetros oficiales de GA4:

| Evento | Parámetros de evento | Datos del producto en `items[]` |
|---|---|---|
| `view_item_list` | `currency`, `item_list_id`, `item_list_name`, `items` | Sí |
| `select_item` | `currency`, `item_list_id`, `item_list_name`, `items` y `search_term` si procede | Sí |
| `view_item` | `currency`, `value`, `items` | Sí |
| `add_to_cart` | `currency`, `value`, `items` | Sí |
| `remove_from_cart` | `currency`, `value`, `items`; `removal_type` es la única ampliación propia | Sí |
| `view_cart` | `currency`, `value`, `items` | Sí |
| `begin_checkout` | `currency`, `value`, `items` | Sí |

Cada elemento de `items[]` utiliza:

| Parámetro oficial | Uso |
|---|---|
| `item_id` | SKU o ID real |
| `item_name` | Nombre comercial |
| `item_brand` | Marca |
| `item_category` | Categoría |
| `item_category2` | Colección |
| `item_variant` | Variante o presentación |
| `price` | Precio unitario |
| `quantity` | Cantidad afectada o contenida |
| `index` | Posición en una lista, cuando existe |

No se envían aliases redundantes como `product_name`, `product_brand`, `product_category`, `product_collection`, `product_price`, `product_quantity`, `list_id`, `list_name`, `cart_value` o `quantity_changed`. Para informes se deben usar las dimensiones y métricas de artículo que GA4 crea a partir de `items[]`, junto con `value`, `currency`, `item_list_id` e `item_list_name`.

## Parámetros estándar que no deben registrarse

No crees definiciones personalizadas para estos campos porque GA4 ya los reconoce:

- `currency`, `value`, `items`
- `item_id`, `item_name`, `item_brand`, `item_category`, `item_category2`, `item_variant`, `price`, `quantity`, `index`
- `item_list_id`, `item_list_name`
- `search_term`
- `page_title`, `page_location`, `page_path`
- `link_url`

Duplicarlos consumiría la cuota de definiciones y podría producir dimensiones incompatibles con las métricas de artículo.

## Dimensiones personalizadas necesarias

Ruta: **Administrador → Visualización de datos → Definiciones personalizadas → Dimensiones personalizadas → Crear dimensión personalizada**.

La implementación no establece propiedades persistentes del usuario. Por ello, todas las definiciones necesarias tienen ámbito **Evento** y no debe crearse ninguna con ámbito Usuario.

| Nombre visible recomendado | Parámetro | Ámbito | Evento(s) |
|---|---|---|---|
| Nombre de página comercial | `page_name` | Evento | Todos |
| Nombre de sección | `section_name` | Evento | `section_view`, `button_click` y clics especializados |
| Nombre del botón | `button_name` | Evento | `button_click`, `whatsapp_click` |
| Texto del botón | `button_text` | Evento | `button_click`, `whatsapp_click` |
| Nombre de categoría seleccionada | `category_name` | Evento | `category_click` |
| Nombre de colección seleccionada | `collection_name` | Evento | `collection_click` |
| Tipo de bebida seleccionado | `drink_type` | Evento | `drink_type_click` |
| Origen de WhatsApp | `whatsapp_source` | Evento | `whatsapp_click` |
| Origen de búsqueda | `search_source` | Evento | `search` |
| Tipo de filtro | `filter_type` | Evento | `filter_apply` |
| Valor del filtro | `filter_value` | Evento | `filter_apply` |
| Origen del filtro | `filter_source` | Evento | `filter_apply` |
| Orden aplicado | `sort_value` | Evento | `sort_apply` |
| Tipo de retirada | `removal_type` | Evento | `remove_from_cart` |
| Porcentaje desplazado | `percent_scrolled` | Evento | `scroll_depth` |
| ID de producto solicitado | `requested_product_id` | Evento | `product_not_found` |

`collection_name` describe el clic de navegación. La colección del producto no necesita esa dimensión: ya se envía mediante el campo estándar `item_category2` dentro de `items[]`.

`search_term` tampoco requiere definición personalizada: forma parte del evento recomendado `search` y GA4 ofrece la dimensión Término de búsqueda.

## Métrica personalizada necesaria

| Nombre visible recomendado | Parámetro | Ámbito | Unidad |
|---|---|---|---|
| Cantidad de resultados | `results_count` | Evento | Estándar |

No registres métricas personalizadas para precio, valor o cantidad del artículo: usa Precio del artículo, Valor del evento, Ingresos del artículo y Cantidad de artículos, según estén disponibles en el conector.

## Eventos personalizados

Los nombres `section_view`, `button_click`, `search_no_results`, `filter_apply`, `sort_apply`, `category_click`, `collection_click`, `drink_type_click`, `whatsapp_click`, `scroll_depth` y `product_not_found` son eventos personalizados válidos. No requieren una definición para que GA4 cuente el evento; las definiciones anteriores son necesarias únicamente para analizar sus parámetros como dimensiones o métricas.

## Verificación

1. Comprueba `page_view`, `view_item_list`, `select_item`, `view_item`, `add_to_cart`, `remove_from_cart`, `view_cart` y `begin_checkout` en Tiempo real.
2. Abre cada evento y verifica `currency = PEN`, `value` cuando corresponda y un arreglo `items` válido.
3. Confirma que el elemento contiene al menos `item_id` o `item_name`; esta implementación envía ambos.
4. Crea las definiciones antes de recopilar los datos que necesites analizar: no son retroactivas y suelen necesitar entre 24 y 48 horas.
5. En Looker Studio actualiza los campos de la fuente después de que GA4 procese las definiciones.

`ANALYTICS_DEBUG` permanece en `false`, `send_page_view` permanece desactivado y la aplicación envía un único `page_view` manual por carga.
