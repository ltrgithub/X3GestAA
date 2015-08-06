using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SageX3WUP.App.Model
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

        public Server(string id, string name, string description, string url, bool isDefault)
        {
            this.Id = id;
            this.Name = name;
            this.Description = description;
            this.Url = url;
            this.IsDefault = isDefault;
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
            for (int i = 0; i < 20; i++)
            {
                this.List.Add(new Server("" + (i*2), "Debug Host", "Debug client on Host Notebook - " +i , "http://vil-004626-nb:8124/syracuse-tablet/html/index_debug.html", true));
                this.List.Add(new Server("" + (i*2+1), "Minified Host", "Minified client on Host Notebook - " + i, "http://vil-004626-nb:8124/syracuse-tablet/dist/index.html", false));
            }
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
    }
}
