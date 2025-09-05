import anvil.server

"""
run:: python uplink_backend.py   in the root /Meedle directory
"""


# Connect to your Anvil app with the Server Uplink key
anvil.server.connect("server_ES4U6USKKB7GV7WRDQFPYRN7-SQTZAKNXHVVXXLJT")

# --- Define your callable functions below ---
@anvil.server.callable
def say_hello(name):
    return f"Hello, {name}!"

# Keep the uplink process alive
anvil.server.wait_forever()
