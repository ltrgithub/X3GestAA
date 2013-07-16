mkdir temp
javac -d temp -classpath ../bcpkix-jdk15on-149.jar;../bcprov-jdk15on-149.jar src/com/sage/x3/syracuse/certtool/CertTool.java
jar cfm ../certgen.jar manifest.txt -C temp .