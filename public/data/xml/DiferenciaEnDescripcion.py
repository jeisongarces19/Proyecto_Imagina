import xml.etree.ElementTree as ET

# Archivos de entrada
archivo_precios = "PriceList_CO_2.xml"
archivo_productos = "ptsinbom_4.xml"

# Archivos de salida
archivo_diferencias = "diferencias.txt"
archivo_filtrado = "diferencias_filtradas.txt"


def normalizar(texto):
    """Limpia texto para comparación"""
    if texto is None:
        return ""
    return texto.strip().upper()


# =========================
# Leer archivo productos
# =========================
tree_prod = ET.parse(archivo_productos)
root_prod = tree_prod.getroot()

productos_dict = {}

for record in root_prod.findall(".//Records"):
    codigo = record.findtext("CODIGO_PT")
    descripcion = record.findtext("DESCRIPCION_LARGA")

    if codigo:
        productos_dict[codigo.strip()] = normalizar(descripcion)


# =========================
# Leer archivo precios
# =========================
tree_precio = ET.parse(archivo_precios)
root_precio = tree_precio.getroot()

diferencias = []

for articulo in root_precio.findall(".//Articulo"):
    codigo = articulo.findtext("Codigo")
    descripcion = articulo.findtext("Descripcion")

    if not codigo:
        continue

    codigo = codigo.strip()
    desc_precio = normalizar(descripcion)

    if codigo in productos_dict:
        desc_producto = productos_dict[codigo]

        if desc_precio != desc_producto:
            diferencias.append(
                f"CODIGO: {codigo}\n"
                f"  Precio XML : {desc_precio}\n"
                f"  Maestro    : {desc_producto}\n"
                f"{'-'*50}\n"
            )
    else:
        diferencias.append(
            f"CODIGO: {codigo} NO EXISTE EN MAESTRO\n"
            f"  Precio XML : {desc_precio}\n"
            f"{'-'*50}\n"
        )


# =========================
# Guardar diferencias
# =========================
with open(archivo_diferencias, "w", encoding="utf-8") as f:
    f.writelines(diferencias)

print("Archivo diferencias generado:", archivo_diferencias)


# =========================
# FILTRAR RESULTADO
# =========================
with open(archivo_diferencias, "r", encoding="utf-8") as f:
    contenido = f.read()

bloques = contenido.split("--------------------------------------------------")

bloques_filtrados = []

for bloque in bloques:
    if "NO EXISTE EN MAESTRO" not in bloque.upper():
        bloque = bloque.strip()
        if bloque:
            bloques_filtrados.append(bloque + "\n" + "-"*50 + "\n")

# Guardar archivo filtrado
with open(archivo_filtrado, "w", encoding="utf-8") as f:
    f.writelines(bloques_filtrados)

print("Archivo filtrado generado:", archivo_filtrado)
