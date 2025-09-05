from ._anvil_designer import LoginTemplate
from anvil import *
import anvil.tables as tables
import anvil.tables.query as q
from anvil.tables import app_tables
import anvil.server
import anvil.users


class Login(LoginTemplate):
  def __init__(self, **properties):
    # Set Form properties and Data Bindings.
    self.init_components(**properties)
    anvil.users.logout()   # <- force sign out every time this form opens


    # Any code you write here will run before the form opens.

  def button_1_click(self, **event_args):
    """This method is called when the button is clicked"""
    anvil.users.login_with_form()
    
    user = anvil.users.get_user()
    if not user:
      Notification("Not signed in!").show()
    else:
      if (user['admin']):
        open_form("LandingPageInstructor")
      else:
        open_form("LandingPageStudent")
