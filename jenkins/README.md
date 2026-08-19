# Jenkins CI/CD Setup Guide for AutoOps Platform

This guide explains how to run Jenkins locally via Docker, configure the `cicd-deploy-pipeline` job, and connect it with the **AutoOps Express Backend**.

---

## 1. Running Jenkins locally via Docker

Run Jenkins in Docker with Docker-in-Docker socket mounting so Jenkins can build & run container images on your host machine:

```bash
docker run -d \
  --name cicd_jenkins \
  -p 8080:8080 \
  -p 50000:50000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v jenkins_home:/var/jenkins_home \
  jenkins/jenkins:lts-jdk17
```

* On Windows PowerShell:
```powershell
docker run -d --name cicd_jenkins -p 8080:8080 -p 50000:50000 -v //./pipe/docker_engine://./pipe/docker_engine jenkins/jenkins:lts-jdk17
```

---

## 2. Retrieving Initial Admin Password

To log into Jenkins for the first time at `http://localhost:8080`:

```bash
docker exec cicd_jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

Follow the setup wizard to install recommended plugins and create your admin account (`admin`).

---

## 3. Creating the Pipeline Job in Jenkins UI

1. Open `http://localhost:8080` -> Click **New Item**.
2. Enter Job Name: `cicd-deploy-pipeline` (Must match `backend/.env`).
3. Select **Pipeline** project type and click **OK**.
4. Check **"This project is parameterized"**:
   - Add String Parameter: `PROJECT_ID`
   - Add String Parameter: `PROJECT_NAME`
   - Add String Parameter: `REPO_URL`
   - Add String Parameter: `BRANCH`
   - Add String Parameter: `DOCKERFILE_PATH`
   - Add String Parameter: `PORT`
   - Add String Parameter: `VERSION`
   - Add String Parameter: `BUILD_NUMBER`
5. Under **Pipeline Definition**, select **Pipeline script from SCM**:
   - SCM: **Git**
   - Repository URL: `https://github.com/Vardhan031/CI-CD-platform.git`
   - Script Path: `jenkins/Jenkinsfile`
6. Click **Save**.

---

## 4. Generating Jenkins User API Token

1. Click your username (`admin`) in top right -> **Configure**.
2. Under **API Token** section -> Click **Add new Token**.
3. Name it `autoops-backend-token` -> Click **Generate**.
4. Copy the generated token and paste it into `backend/.env`:

```env
JENKINS_URL=http://localhost:8080
JENKINS_USER=admin
JENKINS_TOKEN=your_copied_api_token
```

---

## 5. Testing the Pipeline Manually in Jenkins UI

1. Open `http://localhost:8080/job/cicd-deploy-pipeline/`.
2. Click **Build with Parameters**.
3. Click **Build** and observe the 6-Stage execution pipeline!
