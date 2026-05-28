import bcrypt
import time

password = "prism123"
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
print(f"Hashed: {hashed}")

start = time.time()
match = bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
print(f"Match: {match}, Time: {time.time() - start:.4f}s")
