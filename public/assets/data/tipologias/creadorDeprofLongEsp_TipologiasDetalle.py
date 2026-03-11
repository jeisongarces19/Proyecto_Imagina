import json
import re
from pathlib import Path

# =========================
# CONFIGURACIÓN
# =========================
INPUT_FILE = r"tipologias-detalle.json"
OUTPUT_FILE = r"tipologias-detalle-con-medidas.json"
OUTPUT_SIN_MEDIDAS = r"tipologias-sin-medidas.json"

# =========================
# FUNCIÓN PARA EXTRAER DATOS
# =========================
def extraer_medidas(descripcion: str):
    if not descripcion:
        return None, None, None

    texto = descripcion.upper().strip()

    # -----------------------------
    # 1. CASO EXPLÍCITO:
    # PROFUNDIDAD 120 X LONGITUD 120 X 3,0CM
    # -----------------------------
    patron_principal = re.search(
        r'PROFUNDIDAD\s+(\d+(?:[.,]\d+)?)\s*X\s*LONGITUD\s+(\d+(?:[.,]\d+)?)\s*X\s*(\d+(?:[.,]\d+)?)\s*CM',
        texto
    )
    if patron_principal:
        profundidad = patron_principal.group(1)
        longitud = patron_principal.group(2)
        espesor = patron_principal.group(3)
        return profundidad, longitud, espesor

    # -----------------------------
    # 2. ESPESOR POR SEPARADO
    # Busca espesores válidos como:
    # X 3,0CM / X 1,8CM / X 2,5CM
    # -----------------------------
    patron_espesor = re.search(
        r'X\s*(1[.,]5|1[.,]8|2[.,]0|2[.,]5|3[.,]0|3[.,]5)\s*CM\b',
        texto
    )
    espesor = patron_espesor.group(1) if patron_espesor else None

    # -----------------------------
    # 3. BUSCAR LA PRIMERA PAREJA DE MEDIDAS
    # Ejemplo:
    # 165 X 60
    # 150 X 120
    # -----------------------------
    pares = re.findall(r'(\d+(?:[.,]\d+)?)\s*X\s*(\d+(?:[.,]\d+)?)', texto)

    # Convertimos a lista filtrando pares que en realidad sean "algo x espesor"
    espesores_validos = {"1,5", "1.5", "1,8", "1.8", "2,0", "2.0", "2,5", "2.5", "3,0", "3.0", "3,5", "3.5"}
    pares_medidas = []

    for a, b in pares:
        # ignorar pares como 120 x 3,0 donde el segundo valor es espesor
        if b in espesores_validos:
            continue
        pares_medidas.append((a, b))

    if pares_medidas:
        a, b = pares_medidas[0]

        a_num = float(a.replace(",", "."))
        b_num = float(b.replace(",", "."))

        longitud = a if a_num >= b_num else b
        profundidad = b if a_num >= b_num else a

        return profundidad, longitud, espesor

    # -----------------------------
    # 4. SI NO ENCUENTRA PAREJA,
    # devuelve solo espesor si existe
    # -----------------------------
    return None, None, espesor


# =========================
# PROCESO PRINCIPAL
# =========================
def procesar_json(input_file, output_file, output_sin_medidas):
    ruta_entrada = Path(input_file)
    ruta_salida = Path(output_file)
    ruta_sin_medidas = Path(output_sin_medidas)

    with open(ruta_entrada, "r", encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError("El JSON debe ser una lista de objetos.")

    total = 0
    encontrados = 0
    no_encontrados = 0
    sin_medidas = []

    for item in data:
        total += 1
        descripcion = item.get("descripcion", "")

        profundidad, longitud, espesor = extraer_medidas(descripcion)

        item["profundidad"] = profundidad
        item["longitud"] = longitud
        item["espesor"] = espesor

        if profundidad is not None and longitud is not None and espesor is not None:
            encontrados += 1
        else:
            no_encontrados += 1
            sin_medidas.append({
                "codigo": item.get("codigo"),
                "categoria_tipologia_id": item.get("categoria_tipologia_id"),
                "descripcion": item.get("descripcion")
            })

    # Guardar JSON completo procesado
    with open(ruta_salida, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # Guardar solo los que no tuvieron medidas
    with open(ruta_sin_medidas, "w", encoding="utf-8") as f:
        json.dump(sin_medidas, f, ensure_ascii=False, indent=2)

    print("Proceso finalizado.")
    print(f"Total registros: {total}")
    print(f"Con medidas encontradas: {encontrados}")
    print(f"Sin medidas detectadas: {no_encontrados}")
    print(f"Archivo completo: {ruta_salida.resolve()}")
    print(f"Archivo con faltantes: {ruta_sin_medidas.resolve()}")

    if sin_medidas:
        print("\nPrimeros registros sin medidas detectadas:")
        for x in sin_medidas[:10]:
            print(f"- Código: {x['codigo']} | categoria_tipologia_id: {x['categoria_tipologia_id']}")
            print(f"  Descripción: {x['descripcion']}")
            print()


if __name__ == "__main__":
    procesar_json(INPUT_FILE, OUTPUT_FILE, OUTPUT_SIN_MEDIDAS)
