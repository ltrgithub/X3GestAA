using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Storage;

namespace Sage.X3.Mobile.App.Model
{
    /// <summary>
    /// 
    /// </summary>
    public class Server
    {
        public string Id { get; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Url { get; set; }

        public bool IsDefault { get; set; }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="id"></param>
        /// <param name="name"></param>
        /// <param name="description"></param>
        /// <param name="url"></param>
        /// <param name="isDefault"></param>
        public Server(string id, string name, string description, string url, bool isDefault)
        {
            this.Id = id;
            this.Name = name;
            this.Description = description;
            this.Url = url;
            this.IsDefault = isDefault;
        }

        /// <summary>
        /// 
        /// </summary>
        /// <returns></returns>
        public Uri GetStartUrl()
        {
            // Valid resulting urls
            // http://vil-004626-nb:8124/syracuse-tablet/dist/index.html
            // http://vil-004626-nb:8124/syracuse-tablet/html/index_debug.html

            string url;
            string[] segments = this.Url.Split('/');
            if (segments.Length == 3) // Host only
            {
                url = this.Url + "/syracuse-tablet/dist/index.html"; 
            }
            else
            {
                url = this.Url;
            }

            return new Uri(url);
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="url"></param>
        /// <returns></returns>
        public static bool IsValidUrl(string url)
        {
            try
            {
                Uri uri = new Uri(url);
                if (uri.Scheme != "http" && uri.Scheme != "https")
                {
                    return false;
                }

                string[] segments = url.Split('/');
                if (segments.Length != 3 &&
                    !url.EndsWith("syracuse-tablet/dist/index.html") &&
                    !url.EndsWith("syracuse-tablet/html/index_debug.html"))
                {
                    return false;
                }

            }
            catch (Exception)
            {
                return false;
            }

            return true;
        }
    }

    /// <summary>
    /// 
    /// </summary>
    public class Servers
    {
        private static Servers instance;

        public List<Server> List { get; }

        /// <summary>
        /// 
        /// </summary>
        private Servers()
        {
            this.List = new List<Server>();
            this.readServers();
        }

        /// <summary>
        /// 
        /// </summary>
        /// <returns></returns>
        public static Servers GetKnownServers()
        {
            if (instance == null)
            {
                instance = new Servers();
            }
            return instance;
        }


        /// <summary>
        /// 
        /// </summary>
        /// <returns></returns>
        public Server GetDefaultServer()
        {
            Server def = this.List.FirstOrDefault(server => server.IsDefault);
            return def;
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        public Server GetServerById(string id)
        {
            Server srv = this.List.FirstOrDefault(server => server.Id == id);
            return srv;
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="serverId"></param>
        public void DeleteServer(string serverId)
        {
            this.List.RemoveAll(server => { return server.Id.Equals(serverId);  } );
            this.persistServers();
        }

        /// <summary>
        /// 
        /// </summary>
        /// <param name="srv"></param>
        public void SaveServer(Server srv)
        {
            Server srvInList = this.List.FirstOrDefault(server => server.Id == srv.Id);
            if (srvInList == null) // define new server?
            {
                this.List.Add(srv);
                srvInList = srv;
            }
            else
            {
                srvInList.Name = srv.Name;
                srvInList.Description = srv.Description;
                srvInList.Url = srv.Url;
                srvInList.IsDefault = srv.IsDefault;
            }

            // Set new default server
            foreach (Server s in this.List)
            {
                if (srvInList.IsDefault && !s.Id.Equals(srvInList.Id))
                {
                    s.IsDefault = false;
                }
            }
            this.persistServers();
        }

        /// <summary>
        /// 
        /// </summary>
        public void persistServers()
        {
            ApplicationDataContainer localSettings = Windows.Storage.ApplicationData.Current.LocalSettings;
            string serverList = "";
            foreach (Server srv in this.List)
            {
                serverList += "(" + srv.Id + ")\n";
                serverList += "(" + srv.Name + ")\n";
                serverList += "(" + srv.Description + ")\n";
                serverList += "(" + srv.Url + ")\n";
                serverList += "(" + (srv.IsDefault ? "TRUE" : "FALSE") + ")";
                serverList += "\n\n";
            }
            localSettings.Values["servers"] = serverList;
        }

        /// <summary>
        /// 
        /// </summary>
        public void readServers()
        {
            this.List.Clear();

            ApplicationDataContainer localSettings = Windows.Storage.ApplicationData.Current.LocalSettings;
            string serverList = (string)localSettings.Values["servers"];
            if (serverList == null)
            {
                return;
            }

            string[] serverDefs = serverList.Split(new string[] { "\n\n" }, StringSplitOptions.RemoveEmptyEntries);
            foreach (string serverDef in serverDefs)
            {
                string[] lines = serverDef.Split('\n');
                if (lines.Length != 5)
                {
                    continue;
                }
                string id = lines[0].Substring(1, lines[0].Length - 2);
                string name = lines[1].Substring(1, lines[1].Length - 2);
                string description = lines[2].Substring(1, lines[2].Length - 2);
                string url = lines[3].Substring(1, lines[3].Length - 2);
                bool isDefault = lines[4].Substring(1, lines[4].Length - 2).Equals("TRUE");

                Server srv = new Server(id, name, description, url, isDefault);
                this.List.Add(srv);
            }
        }
    }
}
