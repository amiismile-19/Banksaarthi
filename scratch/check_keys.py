import re

with open('Frontend/src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

en_match = re.search(r'\ben:\s*\{([\s\S]*?)\n  \},', content)
en_keys = set(re.findall(r'([a-zA-Z0-9_]+)\s*:', en_match.group(1)))

q_keys = set(re.findall(r'key:\s*"([a-zA-Z0-9_]+)"', content))

missing = q_keys - en_keys
print('Question keys missing from T:', sorted(list(missing)))
