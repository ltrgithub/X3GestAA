using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace CommonDataHelper.OwnerHelper.Model
{
    public class OwnerModel
    {
        [JsonProperty("login")]
        public String login;

        [JsonProperty("$uuid")]
        public String uuid;

        [JsonProperty("firstName")]
        public String firstName;

        [JsonProperty("lastName")]
        public String lastName;
    }
}
