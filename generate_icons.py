from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, filename):
    img = Image.new('RGB', (size, size), '#ce1126')
    draw = ImageDraw.Draw(img)
    # Drapeau burundais simplifié - croix verte
    draw.rectangle([size//2-size//20, 0, size//2+size//20, size], fill='#118b44')
    draw.rectangle([0, size//2-size//20, size, size//2+size//20], fill='#118b44')
    # Cercle blanc au centre
    margin = size//4
    draw.ellipse([margin, margin, size-margin, size-margin], fill='white')
    # U au centre
    font_size = size//3
    draw.text((size//2, size//2), 'U', fill='#ce1126', anchor='mm')
    img.save(f'public/{filename}')
    print(f'{filename} créé !')

try:
    create_icon(192, 'icon-192.png')
    create_icon(512, 'icon-512.png')
except Exception as e:
    print(f'Erreur PIL: {e}')
    # Créer des icônes simples sans PIL
    print('Création icônes basiques...')
