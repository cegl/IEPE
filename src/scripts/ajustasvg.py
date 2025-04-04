import re
from lxml import etree

# Caminho do arquivo SVG
svg_file_path = r'c:\Users\carlo\Documents\Projeto vagas\parking-lot-map\src\assets\2subsvg.svg'

# Regex para identificar labels no formato de 1 a 3 números seguidos de uma letra
label_regex = re.compile(r'^\d{1,3}[A-Za-z]$')

def update_svg_ids(file_path):
    try:
        print(f"Lendo o arquivo SVG: {file_path}")
        # Carregar o arquivo SVG
        parser = etree.XMLParser(remove_blank_text=True)
        tree = etree.parse(file_path, parser)
        root = tree.getroot()

        # Namespace do SVG (necessário para lidar com atributos com prefixos como "inkscape:label")
        namespaces = {'inkscape': 'http://www.inkscape.org/namespaces/inkscape'}

        # Selecionar todos os elementos com o atributo "inkscape:label"
        elements = root.xpath(".//*[@inkscape:label]", namespaces=namespaces)
        print(f"Encontrados {len(elements)} elementos com 'inkscape:label'.")

        for element in elements:
            label = element.attrib.get('{http://www.inkscape.org/namespaces/inkscape}label')
            print(f"Processando elemento com label: {label}")

            # Verificar se o label corresponde ao formato desejado
            if label and label_regex.match(label):
                element.set('id', label)  # Atualizar o ID para ser igual ao label
                print(f"ID atualizado para: {label}")

        # Salvar o SVG atualizado com formatação preservada
        tree.write(file_path, pretty_print=True, encoding='utf-8', xml_declaration=True)
        print("IDs atualizados com sucesso!")

    except Exception as e:
        print(f"Erro ao processar o arquivo SVG: {e}")

# Executar a função
update_svg_ids(svg_file_path)