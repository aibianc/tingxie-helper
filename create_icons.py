#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建微信小程序TabBar图标
生成简单但美观的占位图标
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(text, color, size=81, bg_color=(255, 255, 255, 0)):
    """创建一个简单的图标"""
    img = Image.new('RGBA', (size, size), bg_color)
    draw = ImageDraw.Draw(img)
    
    # 绘制圆形背景
    margin = 8
    draw.ellipse([margin, margin, size-margin, size-margin], fill=color)
    
    # 在中心绘制文本
    try:
        # 尝试加载字体
        font_size = int(size * 0.45)
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    # 获取文本尺寸并居中
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2 - bbox[0]
    y = (size - text_height) // 2 - bbox[1]
    
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    return img

def main():
    # 确保images目录存在
    os.makedirs('images', exist_ok=True)
    
    # 定义图标配置
    icons = [
        # (名称, 文本, 颜色)
        ('home', '🏠', '#667eea'),
        ('book', '📚', '#f093fb'),
        ('history', '📋', '#4facfe'),
        ('medal', '🏆', '#ffd700'),
        ('user', '👤', '#6c757d'),
    ]
    
    # 生成普通状态和选中状态的图标
    for name, emoji, color in icons:
        # 普通状态（灰色）
        gray_icon = create_icon(emoji, (150, 150, 150, 255))
        gray_icon.save(f'images/{name}.png')
        print(f'创建: images/{name}.png')
        
        # 选中状态（彩色）
        active_icon = create_icon(emoji, tuple(int(color.lstrip('#')[i:i+2], 16) for i in (0, 2, 4)) + (255,))
        active_icon.save(f'images/{name}-active.png')
        print(f'创建: images/{name}-active.png')
    
    print('✅ 所有图标创建完成！')

if __name__ == '__main__':
    try:
        main()
    except ImportError:
        print('需要安装 Pillow 库: pip install pillow')
        # 备用方案：创建简单的文本说明
        os.makedirs('images', exist_ok=True)
        print('⚠️ 无法创建图标，请手动添加或使用之前的方案')
