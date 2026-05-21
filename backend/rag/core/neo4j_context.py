from neo4j import GraphDatabase

# =========================
# CONNECTION
# =========================

URI = "bolt://localhost:7687"

USERNAME = "neo4j"

PASSWORD = "password"

driver = GraphDatabase.driver(
    URI,
    auth=(USERNAME, PASSWORD)
)

# =========================
# QUERY
# =========================

def get_species_relationships(
    species_name
):

    query = """

    MATCH (s:Species)-[r]->(n)

    WHERE s.name = $species_name

    RETURN type(r) AS relationship,
           n.name AS target
    """

    with driver.session() as session:

        result = session.run(

            query,

            species_name=species_name
        )

        data = []

        for record in result:

            data.append({

                "relationship":
                record["relationship"],

                "target":
                record["target"]
            })

        return data