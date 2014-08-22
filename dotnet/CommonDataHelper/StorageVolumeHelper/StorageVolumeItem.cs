using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace CommonDataHelper.StorageVolumeHelper
{
    public class StorageVolumeItem
    {
        private string _code;
        private string _uuid;

        public StorageVolumeItem(string code, string uuid)
        {
            _code = code;
            _uuid = uuid;
        }

        public string Code
        {
            get { return _code; }
        }

        public string Uuid
        {
            get { return _uuid; }
        }
    }
}
