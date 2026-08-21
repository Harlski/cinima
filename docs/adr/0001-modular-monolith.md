# Modular monolith, not microservices

Cinima keeps a single deployable API. Domain concerns (catalog, social taste, payments, auth) stay as independent modules with clear seams inside that process so they can be reasoned about and tested apart — but we do not split them into separately deployable services while the product and graph are still small. Rejected alternative: early microservice split, which would add ops cost without earned need.
