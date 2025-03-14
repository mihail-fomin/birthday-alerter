
# Сборка образа

`docker build --no-cache -t birthday-alerter .`

# Запуск контейнера

`
docker run -d --name birthday-alerter \
  --env-file .env.docker \
  -v $(pwd)/logs:/app/logs \
  birthday-alerter
`