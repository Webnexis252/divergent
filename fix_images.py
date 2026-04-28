import os
import re

directory = "/Users/vedansh/Downloads/lmsproto/src"
pattern = re.compile(r'https://www\.figma\.com/api/mcp/asset/([a-f0-9\-]+)')

for root, _, files in os.walk(directory):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
            
            if pattern.search(content):
                new_content = pattern.sub(r'https://api.dicebear.com/9.x/shapes/svg?seed=\1', content)
                with open(filepath, 'w') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
