# Employee Library and Redis API

Two Maven artifacts demonstrate publishing a reusable employee model to Nexus and consuming it from a Spring Boot REST application. The root `pom.xml` is an aggregator only: both children inherit the public Spring Boot parent, so the published library POM has no private parent that a consumer must separately obtain.

## Requirements

- JDK 17 or later and Maven 3.8+
- Docker with the Compose plugin
- `curl` for the Nexus repository setup script

## Start Nexus and Redis

```sh
docker compose up -d
docker compose ps
```

Nexus is at <http://localhost:8081>; Redis listens at `localhost:6379`. On first startup, get the temporary admin password with:

```sh
docker compose exec nexus cat /nexus-data/admin.password
```

Sign in as `admin`, finish the first-run wizard, and either create a dedicated deployment user or use an admin user for this local exercise. Create a Maven 2 hosted repository named `maven-releases` with **Release** version policy and **Allow once** deployment policy. Or, after the first-run wizard, create it through the REST API helper:

```sh
export NEXUS_USERNAME=admin
export NEXUS_PASSWORD='your-nexus-password'
./scripts/create-nexus-repo.sh
```

Nexus may take a few minutes to become ready. The script requires an authenticated user with repository-administration permission and will fail if the repository already exists.

## Configure Maven Credentials

Copy `settings.xml.example` to `~/.m2/settings.xml`, then provide `NEXUS_USERNAME` and `NEXUS_PASSWORD` in the shell that runs Maven. The server ID must remain `employee-nexus-releases`; it matches the library's `distributionManagement` and the app's repository configuration. Do not commit credentials.

The default repository base URL is `http://localhost:8081/repository/maven-releases/`. Override it with `-Dnexus.url=https://nexus.example/repository/maven-releases/` when using another Nexus host. Configure anonymous read access to this hosted repository in Nexus, or provide matching credentials for downloads in Maven settings.

## Build and Publish the Library

`employee-library` contains the reusable JPA employee model, validated request/response contracts, mapper, and not-found exception. Its Maven coordinates are `com.example.employee:employee-library:1.0.0`.

```sh
mvn -pl employee-library clean package
mvn -pl employee-library deploy
```

The deploy command publishes `employee-library-1.0.0.jar` and its POM. Confirm it appears in Nexus under `maven-releases` before building the app as a standalone Maven project.

## Consume the Library and Run the API

The app POM declares the fixed library release version and resolves it from Nexus. Run it as a separate Maven project to exercise the remote artifact download:

```sh
mvn -f employee-redis-app/pom.xml clean verify
mvn -f employee-redis-app/pom.xml spring-boot:run
```

For an all-local reactor build, `mvn clean verify` builds both modules together. The app uses H2 by default and expects Redis at `localhost:6379`. Set `CACHE_TTL=15s` to make expiration easy to observe. `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` can point Spring Data JPA to another database; an included PostgreSQL JDBC driver is available for PostgreSQL URLs.

## REST API

All endpoints are rooted at `/api/employees`. Request bodies must include nonblank `name`, valid `email`, and nonblank `department` values.

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/api/employees` | Create employee; returns `201` |
| `GET` | `/api/employees` | List employees |
| `GET` | `/api/employees/{id}` | Read one employee; returns `404` if absent |
| `PUT` | `/api/employees/{id}` | Replace employee fields and refresh its cache entry |
| `DELETE` | `/api/employees/{id}` | Delete employee and evict related cache entries; returns `204` |

Example requests:

```sh
curl -i -X POST http://localhost:8080/api/employees \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","department":"Research"}'

curl http://localhost:8080/api/employees/1

curl -i -X PUT http://localhost:8080/api/employees/1 \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","department":"Engineering"}'

curl -i -X DELETE http://localhost:8080/api/employees/1
```

## Cache Behavior

- `GET /api/employees/{id}` and `GET /api/employees` use `@Cacheable` in the `employees` cache. The list and individual records have separate keys.
- Create uses `@CachePut` for the new record and evicts the cached list.
- Update uses `@CachePut` to replace that employee's cached value and evicts the list.
- Delete evicts both the record and the list. Missing records are not cached.
- Every entry expires after `app.cache.ttl`, default `10m`; set `CACHE_TTL` to override it. Redis persists its data in the Compose volume, but keys still expire by TTL.

To inspect an entry after fetching an employee:

```sh
docker compose exec redis redis-cli --scan --pattern 'employees::*'
docker compose exec redis redis-cli TTL 'employees::1'
```

Update an employee and read its key's TTL again to see the refreshed cache entry; delete the employee and scan again to confirm eviction.

## Dependency Management

Spring Boot's parent POM manages Spring, H2, PostgreSQL, and test dependency versions. The only application-specific dependency version is the library release (`employee.library.version`); inspect the resolved graph with `mvn -f employee-redis-app/pom.xml dependency:tree`.