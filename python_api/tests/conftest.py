from fastapi.dependencies import utils as fastapi_dependency_utils


fastapi_dependency_utils.ensure_multipart_is_installed = lambda: None
