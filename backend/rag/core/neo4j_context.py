def get_species_relationships(species_name):
    try:
        from neo4j import GraphDatabase
    except ImportError:
        return []

    uri = "bolt://localhost:7687"
    username = "neo4j"
    password = "password"

    try:
        driver = GraphDatabase.driver(uri, auth=(username, password))
        with driver.session() as session:
            result = session.run(
                """
                MATCH (s:Species)-[r]->(n)
                WHERE s.name = $species_name
                RETURN type(r) AS relationship, n.name AS target
                """,
                species_name=species_name,
            )
            return [
                {
                    "relationship": record["relationship"],
                    "target": record["target"],
                }
                for record in result
            ]
    except Exception:
        return []
    finally:
        try:
            driver.close()
        except Exception:
            pass
