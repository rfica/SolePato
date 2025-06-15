# Usa la imagen de Node.js
FROM node:14

# Establece el directorio de trabajo en /app
WORKDIR /app

# Copia los archivos package*.json para instalar dependencias
COPY package*.json ./

# Instala las dependencias
RUN npm install

# Instala nodemon globalmente para el hot-reloading
RUN npm install -g nodemon

# Copia el resto del código de la aplicación
COPY . .

# Exponer el puerto para la API
EXPOSE 5000

# Comando para iniciar la aplicación en modo desarrollo con nodemon
CMD ["nodemon", "server.js"]
