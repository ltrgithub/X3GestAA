using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SageX3WUP.App.Model
{
    public class Server
    {
        public string Id { get; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Url { get; set; }

        public Server(string id, string name, string description, string url)
        {
            this.Id = id;
            this.Name = name;
            this.Description = description;
            this.Url = url;
        }
    }

    public class Servers
    {
        private static Servers instance;

        public List<Server> List { get; }

        private Servers()
        {
            this.List = new List<Server>();
            this.List.Add(new Server("1", "Debug Host", "Debug client on Host Notebook", "http://vil-004626-nb:8124/syracuse-tablet/html/index_debug.html"));
            this.List.Add(new Server("2", "Minified Host", "Minified client on Host Notebook", "http://vil-004626-nb:8124/syracuse-tablet/dist/index.html"));
        }

        public static Servers GetKnownServers()
        {
            if (instance == null)
            {
                instance = new Servers();
            }
            return instance;
        }
    }
}
